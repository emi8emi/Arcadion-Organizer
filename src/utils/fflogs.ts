import 'dotenv/config';
import fs from 'fs';
import { getWorldRegion } from '../data/worlds';
import { AbilityProgPoint, ClearProgPoint, getFightID, getProgPoint, PercentageProgPoint, PhaseProgPoint, ProgPoint, ProgPointE, ProgPointValue } from '../data/fights';

const FFLOGS_TOKEN_URL = 'https://www.fflogs.com/oauth/token';
const FFLOGS_API_URL = 'https://www.fflogs.com/api/v2/client';

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

interface FFLogsTokenResponse {
    access_token: string;
    expires_in: number;
}

interface FFLogsFight {
    id: number;
    name: string;
    encounterID: number;
    difficulty: number;
    kill: boolean;
    startTime: number;
    endTime: number;
    lastPhase: number | null;
    lastPhaseAsAbsoluteIndex: number | null;
    fightPercentage: number;
    friendlyPlayers: number[];
}

interface Actor {
    id: number;
    name: string;
    server: string;
}

interface Report {
    code: string;
    startTime: number;
    endTime: number;
    masterData: {
        actors: Actor[];
    };
    fights: FFLogsFight[];
}

interface PartyReport {
    code: string;
    startTime: number;
    endTime: number;
    events: ReportEventDataResponse | null;
    fights: FFLogsFight[];
}

interface CharacterData {
    canonicalID: number | null,
    recentReports: {
        data: Report[];
    };
}

interface WorldDataResponse {
    worldData: {
        expansions: {
            id: number;
            name: string;
            zones: {
                name: string;
                difficulties: {
                    id: number;
                    name: string;
                }[];
                encounters: {
                    id: number;
                    name: string;
                }[];
            }[];
        }[];
    };
}

interface CharacterDataResponse {
    characterData: {
        character: CharacterData | null;
    };
}

interface ReportDataResponse {
    reportData: {
        report: {
            fights: FFLogsFight[];
        } | null;
    };
}

interface ReportEventDataResponse {
    reportData: {
        report: {
            events: {
                data: string;
            }
        } | null
    }
}

interface Character {
    name: string,
    serverSlug: string
    canonicalID: string | undefined
}

interface Party {
    members: Character[],
    sessionStartMs: number,
    sessionEndMs: number

    fightName: string,
    progPoint: ProgPoint
}

enum HostilityType {
    Friendlies = 'Friendlies',
    Enemies = 'Enemies'
}

enum KillType {
    All = "All",
    Encounters = "Encounters",
    Kills = "Kills",
    Trash = "Trash",
    Wipes = "Wipes"
}

async function getToken(): Promise<string> {
    if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

    const response = await fetch(FFLOGS_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: process.env.FFLOGS_CLIENT_ID || '',
            client_secret: process.env.FFLOGS_CLIENT_SECRET || '',
        }),
    });

    const data = await response.json() as FFLogsTokenResponse;
    cachedToken = data.access_token;
    tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    return cachedToken;
}

async function query<T>(gql: string): Promise<T> {
    const token = await getToken();

    const response = await fetch(FFLOGS_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ query: gql }),
    });

    const result = await response.json();
    if (result.errors) throw new Error(JSON.stringify(result.errors));
    return result.data as T;
}

export async function getCanonicalId(name: string, server: string) {
    const characterDataResponse = await query<CharacterDataResponse>(`
        {
            characterData {
                character(name: "${name}", serverSlug: "${server}", serverRegion: "${getWorldRegion(server)}") {
                    canonicalID
                }
            }
        }
    `);
    if (characterDataResponse.characterData.character?.canonicalID) {
        return characterDataResponse.characterData.character.canonicalID.toString();
    }
    return null;
}

export async function reportQuery(reportCode: string): Promise<ReportDataResponse> {
    return query<ReportDataResponse>(`
        {
            reportData {
                report(code: "${reportCode}") {
                    fights(killType: All) {
                        id
                        name
                        difficulty
                        kill
                        startTime
                        endTime
                        lastPhase
                        lastPhaseAsAbsoluteIndex
                        fightPercentage
                    }
                }
            }
        }
    `);
}

export async function reportEventsQuery(reportCode: string, fightIDs?: number[], filterExpression?: string) {
    const useFightIDs = fightIDs && fightIDs.length > 0 ? `${JSON.stringify(fightIDs)}` : null
    const useFilterExpression = filterExpression ? `${filterExpression}` : null

    return query<ReportEventDataResponse>(`
        {
            reportData {
                report(code: "${reportCode}") {
                    events(
                    filterExpression: ${useFilterExpression}, 
                    useAbilityIDs: false, 
                    useActorIDs: true, 
                    fightIDs: ${useFightIDs}) {
                        data
                    }
                }
            }
        }
    `);
}

// export function matchProgPoint(progPoint: ProgPoint): string {
//     switch (progPoint.value.type) {
//         case "phase":
//             return progPoint.value.phase;
//         case "percentage":
//             return progPoint.value.fightPercentage;
//         case "ability":
//             return progPoint.value.abilityName;
//         case "clear":
//             return "Clear";
//     }
// }

export async function sessionReportQuery(character: Character, fightID?: number, killType?: KillType): Promise<CharacterDataResponse> {
    const useFightID = fightID ? `${fightID}` : null;
    const useKillType = killType ? killType as string : KillType.All as string;
    const useCanonicalId = !character.canonicalID ? `name: "${character.name}", serverSlug: "${character.serverSlug}", serverRegion: "${getWorldRegion(character.serverSlug)}"` : `id: ${character.canonicalID}`


    return await query<CharacterDataResponse>(`
        {
            characterData {
                character(${useCanonicalId}) {
                    recentReports(limit: 3) {
                        data {
                            code
                            startTime
                            endTime
                            masterData {
                                actors(type: "Player") {
                                    id
                                    name
                                    server
                                }
                            }
                            fights(killType: ${useKillType}, encounterID: ${useFightID}) {
                                id
                                name
                                encounterID
                                difficulty
                                kill
                                lastPhase
                                fightPercentage
                                friendlyPlayers
                            }
                        }
                    }
                }
            }
        }
    `);
}

export async function findSessionReport(
    character: Character,
    fightName: string,
    killType?: KillType
): Promise<FullFightReport> {
    const fightIDs = getFightID(fightName);
    if (!fightIDs) return { P1: null, P2: null };

    const fightP1 = await sessionReportQuery(character, fightIDs[0], killType);
    if (!fightP1.characterData.character) return { P1: null, P2: null };
    if (fightIDs[1]) {
        const fightP2 = await sessionReportQuery(character, fightIDs[1], killType);
        if (!fightP2.characterData.character) return { P1: fightP1, P2: null };
        return { P1: fightP1, P2: fightP2 };
    }
    return { P1: fightP1, P2: null };
}

export async function getWorldData(): Promise<WorldDataResponse> {
    return await query<WorldDataResponse>(`
        {
            worldData {
                expansions {
                    id
                    name
                    zones {
                        name
                        difficulties {
                            id
                            name
                        }
                        encounters {
                            id
                            name
                        }
                    }
                }
            }
        }
    `);
}

export async function writeWorldData() {
    const data = await getWorldData();
    const stringData = JSON.stringify(data, null, 2);
    fs.writeFileSync('src/data/allFights.json', stringData);
    console.log(`World data saved to allFights.json`);
}

export function writeUltimateData() {
    const rawData = JSON.parse(fs.readFileSync('src/data/allFights.json', 'utf8')) as WorldDataResponse;
    const extremeTier = rawData.worldData.expansions[0].zones;
    const ultimateIndex = extremeTier.findIndex(zone => zone.name === 'Ultimates (Legacy)');

    if (ultimateIndex === -1) {
        console.error('Could not find Ultimates (Legacy) in world data');
        return;
    }

    const ultimatesLegacy = extremeTier.slice(ultimateIndex, ultimateIndex + 1);
    let data = [...ultimatesLegacy];

    for (const expansion of rawData.worldData.expansions) {
        if (expansion.name === 'Stormblood') break;
        data.push(...expansion.zones.slice(0, 3));
    }

    for (const expansion of rawData.worldData.expansions) {
        if (expansion.name === 'Shadowbringers') break;
        const legacyIndex = expansion.zones.findIndex(zone => zone.name === 'Ultimates (Legacy)');
        if (legacyIndex !== -1) {
            const extremesCurrent = expansion.zones.slice(legacyIndex + 1, legacyIndex + 4);
            data.push(...extremesCurrent);
        }
    }

    fs.writeFileSync(`src/data/ultimates.json`, JSON.stringify(data, null, 2));
    console.log(`Ultimate data saved to ultimates.json`);
}

export async function storeQueryResults(character: Character, fightName: string, sessionStartMs: number, sessionEndMs: number, filename: string) {
    const data = await findSessionReport(character, fightName);
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`Results saved to ${filename}`);
}

export async function getPartyLogs(party: Party): Promise<PartyReport[]> {

    switch (party.progPoint.value.type) {
        case ProgPointE.Phase:
            return await handleProgpointPhase(party, party.progPoint.value);
        case ProgPointE.Percentage:
            return await handleProgpointPercentage(party, party.progPoint.value);
        case ProgPointE.Ability:
            return await handleProgpointAbility(party, party.progPoint.value);
        case ProgPointE.Clear:
            return handleProgpointClear(party);
    }


    let validLogs: Report[] = await filterPartyLogs(party);

    let partyLogs: PartyReport[] = [];
    validLogs.forEach(report => {
        let partyReport: PartyReport = {
            code: report.code,
            startTime: report.startTime,
            endTime: report.endTime,
            events: null,
            fights: report.fights
        }
        partyLogs.push(partyReport);
    });

    return partyLogs;
}

function buildAbilityFilterExpression(abilityName: string): string {
    return `ability.name = ${abilityName}`
}

async function handleProgpointAbility(party: Party, progAbility: AbilityProgPoint): Promise<PartyReport[]> {
    const partyLogs = await filterPartyLogs(party);

    let filteredLogs: (PartyReport | undefined)[] = await Promise.all(partyLogs.map(async report => {
        let fightIDs: Set<number> = new Set();
        let filteredFights: FFLogsFight[] = [];
        report.fights.forEach(fight => fightIDs.add(fight.id));
        const fightIDArray: number[] = Array.from(fightIDs);

        const filterExpression = buildAbilityFilterExpression(progAbility.abilityName);
        const events = await reportEventsQuery(report.code, fightIDArray, filterExpression);
        if (!events.reportData.report || !events.reportData.report.events.data) return;

        const partyReport: PartyReport = {
            code: report.code,
            startTime: report.startTime,
            endTime: report.endTime,
            events: events,
            fights: filteredFights
        };
        return partyReport;
    }));

    const filteredPartyLogs: PartyReport[] = filteredLogs.filter(log => log != undefined);

    return filteredPartyLogs;
}

async function handleProgpointPercentage(party: Party, progPercentage: PercentageProgPoint): Promise<PartyReport[]> {
    const partyLogs = await filterPartyLogs(party);

    let filteredLogs: PartyReport[] = [];
    partyLogs.forEach(report => {
        let filteredFights: FFLogsFight[] = [];
        report.fights.forEach(fight => {
            if (fight.fightPercentage >= progPercentage.fightPercentage) filteredFights.push(fight);
        })
        if (filteredFights.length > 0) {
            const partyReport: PartyReport = {
                code: report.code,
                startTime: report.startTime,
                endTime: report.endTime,
                events: null,
                fights: filteredFights
            }
            filteredLogs.push(partyReport);
        }
    })

    return filteredLogs;
}

async function handleProgpointPhase(party: Party, progPhase: PhaseProgPoint): Promise<PartyReport[]> {
    const partyLogs = await filterPartyLogs(party);

    let filteredLogs: PartyReport[] = [];
    partyLogs.forEach(report => {
        let filteredFights: FFLogsFight[] = [];
        report.fights.forEach(fight => {
            if (fight.lastPhase == progPhase.phase) filteredFights.push(fight);
        })
        if (filteredFights.length > 0) {
            const partyReport: PartyReport = {
                code: report.code,
                startTime: report.startTime,
                endTime: report.endTime,
                events: null,
                fights: filteredFights
            }
            filteredLogs.push(partyReport);
        }
    })

    return filteredLogs;
}

async function handleProgpointClear(party: Party): Promise<PartyReport[]> {
    const partyLogs = await filterPartyLogs(party, KillType.Kills);

    let filteredLogs: PartyReport[] = [];
    partyLogs.forEach(report => {
        const partyReport: PartyReport = {
            code: report.code,
            startTime: report.startTime,
            endTime: report.endTime,
            events: null,
            fights: report.fights
        }

        filteredLogs.push(partyReport);
    });

    return filteredLogs;
}

function checkPartyMembers(partyMembers: string[], data: CharacterDataResponse) {
    if (!data.characterData.character) return [];
    let fights: FFLogsFight[] = [];
    let reports: Report[] = [];
    for (const report of data.characterData.character.recentReports.data) {
        const masterData = report.masterData;
        let validParty = false;
        for (const fight of report.fights) {
            // dict for debugging purposes
            let dict = new Map<number, string>();
            for (const actorId of fight.friendlyPlayers) {
                const mappedName = mapPlayerToName(actorId, masterData.actors);
                if (!mappedName) continue;
                dict.set(actorId, mappedName);
            }

            const dictMember = Array.from(dict.values());
            if (partyMembers.every(member => dictMember.includes(member))) {
                fights.push(fight);
                validParty = true;
            }
        }

        if (validParty) {
            report.fights = fights;
            reports.push(report);
        }

    }
    return reports;
}

interface FullFightReport {
    P1: CharacterDataResponse | null,
    P2: CharacterDataResponse | null
}

async function filterPartyLogs(party: Party, killType?: KillType): Promise<Report[]> {
    const fightIDs = getFightID(party.fightName);
    let fightID = undefined;
    if (fightIDs) fightID = fightIDs[0];

    const data = await findSessionReport(party.members[0], party.fightName, killType)

    if (!data.P1 || !data.P1.characterData.character) return [];


    let validLogs: Report[] = [];
    const partyMembers = party.members.map(member => member.name);
    if (data.P1.characterData.character) {
        const p1Fights = checkPartyMembers(partyMembers, data.P1);
        if (p1Fights.length > 0) {
            validLogs.push(...p1Fights);
        }
    }

    if (data.P2 && data.P2.characterData.character) {
        const p2Fights = checkPartyMembers(partyMembers, data.P2);
        if (p2Fights.length > 0) {
            validLogs.push(...p2Fights);
        }
    }
    return validLogs;
}

function mapPlayerToName(playerID: number, reportMasterData: Actor[]) {
    const found = reportMasterData.find(actor => actor.id === playerID);
    if (!found) return null;
    if (found.server === null) return null;
    return found.name;
}

// Test calls if run directly
if (require.main === module) {
    (async () => {
        const testDate = new Date("March 8, 2026 3:09 AM");
        const heyaKo: Character = {
            name: 'Heya Ko',
            serverSlug: 'Cactuar',
            canonicalID: '20585376'
        };

        const heyaKou: Character = {
            name: 'Heya Kou',
            serverSlug: 'Behemoth',
            canonicalID: '18854303'
        };

        const kelsier: Character = {
            name: 'Stella Yarnes',
            serverSlug: 'Exodus',
            canonicalID: '20902440'
        }

        // storeQueryResults(kelsier, 'fru', 0, Date.now(), 'kelsierFRU.json');

        // console.log(await getCanonicalId(kelsier.name, kelsier.serverSlug));

        // const party: Party = {
        //     members: [
        //         { name: 'Heya Kou', serverSlug: 'Behemoth', canonicalID: undefined },
        //         { name: 'Dancing Forgil', serverSlug: 'Gilgamesh', canonicalID: undefined },
        //         { name: 'Nox Box', serverSlug: 'Gilgamesh', canonicalID: undefined },
        //         { name: 'Celestia Yamulain', serverSlug: 'Gilgamesh', canonicalID: undefined },
        //         { name: 'Intergy Harvey', serverSlug: 'Gilgamesh', canonicalID: undefined },
        //         { name: 'Ksenya Triborn', serverSlug: 'Excalibur', canonicalID: undefined },
        //         { name: 'Ratya Namo', serverSlug: 'Seraph', canonicalID: undefined },
        //         { name: 'Yang Miao-long', serverSlug: 'Midgardsormr', canonicalID: undefined }
        //     ],
        //     fightName: 'fru',
        //     progPoint: getProgPoint('fru', 'p5'),
        //     sessionStartMs: 0,
        //     sessionEndMs: testDate.getTime(),
        // }

        const party: Party = {
            members: [
                { name: 'Charlotte Wuh', serverSlug: 'Diabolos', canonicalID: undefined },
            ],
            fightName: 'fru',
            progPoint: getProgPoint('fru', 'p5'),
            sessionStartMs: 0,
            sessionEndMs: testDate.getTime(),
        };

        const data = await getPartyLogs(party);
        const filename = "party.json"
        fs.writeFileSync(filename, JSON.stringify(data, null, 2));
        console.log(`Results saved to ${filename}`);
    })();
}
