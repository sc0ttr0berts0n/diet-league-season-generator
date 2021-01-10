import Season from './season';

const season = new Season({ playerCount: 20 });
season.matches;
season.matches.forEach((match, index) => {
    console.log(`${index}:${JSON.stringify(match)}`);
});
debugger;
console.log(season.getDeviationScore());
debugger;
