const COLUMNS_TO_ITERATE = 8;
const DRIVERS_IN_ROW = 10;

const POINTS_SHEET_OFFSETS = {row: 1, column: 2};
const STANDINGS_URL = "https://ergast.com/api/f1/2022/driverStandings.json";
const RESULT_URL = "https://ergast.com/api/f1/2022/results.json?limit=500";
const SPRINT_URL = "https://ergast.com/api/f1/2022/sprint.json?limit=500";

function calculatePoints()
{  
  const standingsResponse = UrlFetchApp.fetch(STANDINGS_URL);
  const championship = JSON.parse(standingsResponse);

  //TODO: we could just use getRaceResultsWithSprintPoints()
  const standings = championship.MRData.StandingsTable.StandingsLists[0].DriverStandings.reduce(
    (accumulator, position) => ({ ...accumulator, [position.Driver.code]: parseInt(position.points) }), {});

  const last5RaceStandings = getRaceResultsWithSprintPoints().slice(-5).reduce( (standingsAccumulator, race) => 
    mergeObjects(
      standingsAccumulator,
      race
    ), {});

  const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  calculateColumnPoints(standings, sheets[0], 0);
  calculateColumnPoints(last5RaceStandings, sheets[0], 1);
}

function getRaceResultsWithSprintPoints()
{
  const response = UrlFetchApp.fetch(RESULT_URL);
  const standings = JSON.parse(response);

  const sprintResponse = UrlFetchApp.fetch(SPRINT_URL);
  const sprintResults = JSON.parse(sprintResponse);

  let races = standings.MRData.RaceTable.Races.map(race => race.Results.reduce(
    (accumulator, result) => ({ ...accumulator, [result.Driver.code]: parseInt(result.points) }), {}));

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
  return races;
}

function mergeObjects(object1, object2) {
  // Go through object2 entries and use object1 as initial value for accumulator
  return Object.entries(object2).reduce((acc, [key, value]) => 
    // If a key is already in accumulator, sum the values together, otherwise add a new key
    ({ ...acc, [key]: (acc[key] || 0) + value })
    , { ...object1 });
}

function calculateColumnPoints(standings, rowsSheet, outputRowOffset)
{
    for (let columnIndex = 0; columnIndex < COLUMNS_TO_ITERATE; columnIndex++) 
    {
      const drivers = rowsSheet.getRange(POINTS_SHEET_OFFSETS.row, POINTS_SHEET_OFFSETS.column+columnIndex,DRIVERS_IN_ROW).getValues();   
      const racePoints = calculatePointsFromRace(standings, drivers);     
      const resultCell = rowsSheet.getRange(POINTS_SHEET_OFFSETS.row+DRIVERS_IN_ROW+outputRowOffset, POINTS_SHEET_OFFSETS.column+columnIndex);
      resultCell.setValue(racePoints);
    }
}

function calculatePointsFromRace(standings, drivers)
{
  let racePoints = 0;
  for (let j = 0; j < drivers.length; j++) {
    racePoints += (DRIVERS_IN_ROW-j) * standings[drivers[j]];
  }
  return racePoints;
}
