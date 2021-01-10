declare global {
    type Player = string;
    type Team = [Player, Player];
    type Match = [Team, Team];
    type Schedule = Match[][];
    interface SeasonOptions {
        seed?: number;
        playerCount?: number;
        generateFirstSeason?: boolean;
        isSeeded?: boolean;
        rejectZeros?: boolean;
    }
    interface OppoList {
        [key: string]: number;
    }
}

export default class Season {
    public matches: Match[];
    public teams: Team[];
    public schedule: Schedule[];
    public opts: SeasonOptions;
    public players: Player[];
    public rejectZeros: boolean;

    constructor(options: SeasonOptions = {}) {
        this.opts = Object.assign(
            {
                seed: 28,
                playerCount: 20,
                generateFirstSeason: true,
                isSeeded: true,
                rejectZeros: true,
            },
            options
        );
        if (this.opts.generateFirstSeason) {
            this.generateSeason();
        }
    }

    generateSeason() {
        this.players = this.getLetterSequenceArray(this.opts.playerCount);
        this.matches = this.assignMatchesViaWhistAlgorithm();
        this.teams = this.matches.flat();
        this.schedule = this.getSchedule();
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
    getLetterFromNumber = (n: number): string => {
        return String.fromCharCode('A'.charCodeAt(0) + n);
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

    assignMatchesViaWhistAlgorithm = () => {
        // http://www.durangobill.com/BridgeCyclicSolutions.html
        let matches = [];
        const magicNumbers = [
            [14, 15, 19, 0],
            [16, 18, 1, 10],
            [4, 7, 6, 13],
            [5, 9, 12, 17],
            [2, 8, 3, 11],
        ];

        for (let offset = 0; offset < this.opts.playerCount - 1; offset++) {
            const round = magicNumbers.map((table) => {
                return table.map((seat) => {
                    if (seat === 0) {
                        return 'A';
                    }
                    let leftOfMod = 40000 + seat - offset;
                    if (leftOfMod <= 40000) {
                        leftOfMod -= 1;
                    }
                    let value = Math.abs(leftOfMod) % this.opts.playerCount;

                    let letter = this.getLetterFromNumber(value);

                    return letter;
                });
            });
            matches.push(...round);
        }

        // return in matches format
        return matches.map(
            (m: string[]): Match => {
                return [
                    [m[0], m[1]],
                    [m[2], m[3]],
                ];
            }
        );
    };

    getDeviationScore = (
        players: Player[] = this.players,
        matches: Match[] = this.matches
    ) => {
        // build map that tracks oppo matchups
        const playerOpponentMap: Map<Player, OppoList> = new Map();
        players.forEach((player, index, arr) => {
            const oppos = arr
                .filter((oppo) => oppo !== player)
                .reduce((obj: OppoList, el, i) => {
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
            const tallyOppos = (players: Player[], oppos: Player[]) => {
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

        if (this.rejectZeros && min <= 0) {
            return Infinity;
        }
        const deviationSum = deviations.reduce((acc, cur) => acc + cur, 0);

        const deviationScore = deviationSum / deviations.length;
        return deviationScore;
    };

    getSchedule(packCount = 10) {
        // const packs = new Array(packCount).fill(new Set());
        const packs = new Array(packCount).fill(0).map((el) => []);
        const packScoreMaps = new Array(packCount)
            .fill(0)
            .map((el) => new Map());
        packScoreMaps.forEach((pack) => {
            this.players.forEach((player) => {
                pack.set(player, 0);
            });
        });

        this.matches.forEach((match) => {
            // get all scores
            const scores = [...packScoreMaps].map((scoreMap) => {
                const _packScore = (
                    match: Match,
                    scoreMap: Map<string, number>
                ) => {
                    return match.flat().reduce((acc, player) => {
                        return acc + scoreMap.get(player);
                    }, 0);
                };

                return _packScore(match, scoreMap);
            });

            // find low score
            const lowScore = Math.min(...scores);

            const matchDestinationIndex = scores.indexOf(lowScore);

            packs[matchDestinationIndex].push(match);

            match.flat().forEach((player) => {
                const value =
                    packScoreMaps[matchDestinationIndex].get(player) + 1;
                packScoreMaps[matchDestinationIndex].set(player, value);
            });
            // debugger;
        });

        packs.forEach((pack, index) => {
            console.log(`\nPack: ${index}`);

            pack.forEach((game) => {
                console.log(JSON.stringify(game));
            });
        });

        return packs;
    }
}
