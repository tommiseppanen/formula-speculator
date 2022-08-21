const COLUMNS_TO_ITERATE = 8;
const DRIVERS_IN_ROW = 10;
const POINTS_SHEET_OFFSETS = {row: 1, column: 2};
const RESULT_URL = "https://ergast.com/api/f1/2022/results.json?limit=500";
const SPRINT_URL = "https://ergast.com/api/f1/2022/sprint.json?limit=500";

function calculatePoints()
{  
  const raceResults = getRaceResults();
  const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  calculatePointsFromStandings(calculateStandings(raceResults), sheets[0], 0);
  calculatePointsFromStandings(calculateStandings(raceResults.slice(-5)), sheets[0], 1);
}

function getRaceResults()
{
  const raceResults = JSON.parse(UrlFetchApp.fetch(RESULT_URL));
  const sprintResults = JSON.parse(UrlFetchApp.fetch(SPRINT_URL));

  let racePoints = raceResults.MRData.RaceTable.Races.map(race => race.Results.reduce(
    (accumulator, result) => ({ ...accumulator, [result.Driver.code]: parseInt(result.points) }), {}));

  MergeSprintPointsToRacePoints(racePoints, sprintResults);
  return racePoints;
}

function MergeSprintPointsToRacePoints(races, sprintResults) {
  for (let sprintIndex = 0; sprintIndex < sprintResults.MRData.RaceTable.Races.length; sprintIndex++) 
  {
      for (let resultIndex = 0; resultIndex < sprintResults.MRData.RaceTable.Races[sprintIndex].SprintResults.length; resultIndex++)
      {
        const round = sprintResults.MRData.RaceTable.Races[sprintIndex].round-1;
        if (round >= races.length) //sanity check that we don't try to access race result that don't exist yet (sprints happen before race)
          continue;
        const driver = sprintResults.MRData.RaceTable.Races[sprintIndex].SprintResults[resultIndex].Driver.code;
        races[round][driver] += parseInt(sprintResults.MRData.RaceTable.Races[sprintIndex].SprintResults[resultIndex].points);
      }
  }
}

function calculateStandings(results) {
  return results.reduce( (standingsAccumulator, raceResult) => 
    mergeRacePoints(standingsAccumulator,raceResult), {});
}

function mergeRacePoints(race1, race2) {
  // Go through race2 entries and use race1 as initial value for accumulator
  return Object.entries(race2).reduce((acc, [driver, points]) => 
    // If a driver is already in accumulator, sum the points together, otherwise add a new key for the driver
    ({ ...acc, [driver]: (acc[driver] || 0) + points })
    , { ...race1 });
}

function calculatePointsFromStandings(standings, rowsSheet, outputRowOffset)
{
    for (let columnIndex = 0; columnIndex < COLUMNS_TO_ITERATE; columnIndex++) 
    {
      const drivers = rowsSheet.getRange(POINTS_SHEET_OFFSETS.row, POINTS_SHEET_OFFSETS.column+columnIndex,DRIVERS_IN_ROW).getValues();   
      const racePoints = calculateWeightedSumOfPoints(standings, drivers);     
      const resultCell = rowsSheet.getRange(POINTS_SHEET_OFFSETS.row+DRIVERS_IN_ROW+outputRowOffset, POINTS_SHEET_OFFSETS.column+columnIndex);
      resultCell.setValue(racePoints);
    }
}

function calculateWeightedSumOfPoints(standings, drivers)
{
  let racePoints = 0;
  for (let j = 0; j < drivers.length; j++) {
    racePoints += (DRIVERS_IN_ROW-j) * standings[drivers[j]];
  }
  return racePoints;
}
