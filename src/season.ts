declare global {
    type Player = string;
    type Team = [Player, Player];
    type Match = [Team, Team];
    interface SeasonOptions {
        seed?: number;
        playerCount?: number;
        generateFirstSeason?: boolean;
        isSeeded?: boolean;
    }
}

export default class Season {
    public matches: Match[];
    public teams: Team[];
    public opts: SeasonOptions;
    public players: Player[];

    constructor(options: SeasonOptions = {}) {
        this.opts = Object.assign(
            {
                seed: 28,
                playerCount: 20,
                generateFirstSeason: true,
                isSeeded: true,
            },
            options
        );
        if (this.opts.generateFirstSeason) {
            this.generateSeason();
        }
    }

    generateSeason() {
        this.players = this.getLetterSequenceArray(this.opts.playerCount);
        this.teams = this.combinePlayersIntoTeams(this.players);
        this.matches = this.assignMatches(this.teams);
    }

    rng() {
        if (this.opts.isSeeded) {
            const n = Math.sin(this.opts.seed++) * 10000;
            return n - Math.floor(n);
        } else {
            return Math.random();
        }
    }

    getLetterSequenceArray = (n: number): Player[] => {
        return [...Array(n)].map((_, i) => {
            return String.fromCharCode('A'.charCodeAt(0) + i);
        });
    };

    // get every team combo possible
    combinePlayersIntoTeams = (players: Player[]) => {
        const teams = [];

        // for each player, find all unique partners
        for (let i = 0; i <= players.length - 2; i++) {
            const player = players[i];
            // get a list of all the partners *after*
            // this partner in order given by players variable
            const subArr = [...players].splice(i + 1);

            // pair each teammate in the sublist with
            // each player from the outer loop
            for (let j = 0; j < subArr.length; j++) {
                // push those pairs to the teams array
                teams.push([player, subArr[j]]);
            }
        }

        return teams;
    };

    // take a set of teams, and assign them matches
    assignMatches = (arr: Team[]) => {
        // make a list to hold all matches
        const matches = [];
        const teams = [...arr];

        // pull teams out of the teams list
        // until 0 or 1 remain
        while (teams.length > 1) {
            // helper function get a random index from a given array
            const _randomArrayIndex = (arr: any) => {
                return Math.floor(this.rng() * arr.length);
            };

            // get two random teams
            const _getMatch = () => {
                // first, get a random team
                const teamA: Team = teams.splice(
                    _randomArrayIndex(teams),
                    1
                )[0];

                // find a valid oppo for that team
                const validOpponents = teams.filter((teamB: Team) => {
                    // combine and alphabetize to check for a player
                    // who ends up playing on both teams
                    const combined = [...teamA, ...teamB].sort();
                    return (
                        combined[0] !== combined[1] &&
                        combined[1] !== combined[2] &&
                        combined[2] !== combined[3]
                    );
                });
                if (validOpponents.length === 0) {
                    return false;
                } else {
                    // get teamB from valid oppos
                    const teamB =
                        validOpponents[_randomArrayIndex(validOpponents)];

                    // remove teamB from teams
                    teams.splice(teams.indexOf(teamB), 1)[0];

                    return [teamA, teamB];
                }
            };

            // combine them into a match
            const match = _getMatch();

            // if there are no valid opponents, end the loop
            if (!match) {
                break;
            }

            // push the match into the array
            matches.push(match);
        }
        return matches;
    };

    assignMatchesOutsideIn(teams: Team[]): Match[] {
        if (teams.length % 2 !== 0) {
            throw new Error(
                `Team Count of ${teams.length} results in leftover team.`
            );
        }
        const mutateableTeams = [...teams];
        const matches = Array(teams.length / 2)
            .fill(0)
            .map(() => {
                return [mutateableTeams.shift(), mutateableTeams.pop()];
            });
        console.log(matches);
        return matches as Match[];
    }

    getDeviationScore = (
        players: Player[] = this.players,
        matches: Match[] = this.matches
    ) => {
        // build map that tracks oppo matchups
        const playerOpponentMap: Map<Player, {}> = new Map();
        players.forEach((player, index, arr) => {
            const oppos = arr
                .filter((oppo) => oppo !== player)
                .reduce((obj, el, i) => {
                    obj[el] = 0;
                    return obj;
                }, {});
            // todo: convert array to object
            playerOpponentMap.set(player, oppos);
        });

        // tally up matches that each player plays against oppos
        matches.forEach((match, i, self) => {
            const leftSideOppos = match[0];
            const rightSideOppos = match[1];
            const tallyOppos = (players, oppos) => {
                players.forEach((player) => {
                    oppos.forEach((oppo) => {
                        const key = playerOpponentMap.get(player);
                        key[oppo]++;
                        playerOpponentMap.set(player, key);
                    });
                });
            };
            tallyOppos(leftSideOppos, rightSideOppos);
            tallyOppos(rightSideOppos, leftSideOppos);
        });

        // present oppos
        const oppoMapArray = Array.from(playerOpponentMap.entries());
        const playerDeviationMap = new Map();
        oppoMapArray.forEach((el) => {
            const key = el[0];
            const values: number[] = Object.values(el[1]);
            const min = Math.min(...values);
            const max = Math.max(...values);
            const deviation = max - min;
            playerDeviationMap.set(key, { min, max, deviation });
        });

        const values = Array.from(playerDeviationMap.values());
        const min = Math.min(...values.map((el) => el.min));
        const deviations = values.map((el) => el.deviation);

        if (min <= 0) {
            return Infinity;
        }
        const deviationSum = deviations.reduce((acc, cur) => acc + cur, 0);

        const deviationScore = deviationSum / deviations.length;
        return deviationScore;
    };
}
