import React from 'react';
import jaLocale from 'date-fns/locale/ja';
import DateAdapter from '@mui/lab/AdapterDateFns';
import LocalizationProvider from "@mui/lab/LocalizationProvider";
import CssBaseline from '@mui/material/CssBaseline';
import {
    Button,
    Checkbox,
    FormControlLabel, Switch,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField
} from "@mui/material";
import {DatePicker} from "@mui/lab";
import {addDays, compareAsc, compareDesc, endOfDay, format} from "date-fns";
import "./App.css";

interface AppState {
    global: GlobalState,
    showAll: boolean,
}

interface GlobalState {
    anime: Record<string, AnimeInfo>,
    watched: Record<string, Set<number>>,
}

interface AnimeInfo {
    name: string,
    start: Date,
    first: number,
    intervalDays: number,
}

interface SingleAnimeProps {
    number: number,
    available: Date,
    animeInfo: AnimeInfo,
    updateAnimeInfo: (update: Partial<AnimeInfo>) => void,
    watched: boolean,
    markWatched: (watched: boolean) => void,
}

interface SingleAnimeNumber {
    type: 'anime',
    id: string,
    index: number,
    available: Date,
    info: AnimeInfo,
    watched: boolean
}

interface TodayDividerMarker {
    type: 'today-marker',
    available: Date,
}

class App extends React.Component<{}, AppState> {
    constructor(props: {}) {
        super(props);
        this.state = {
            global: {
                anime: {
                    "random": {
                        name: "アニメ1",
                        start: new Date(),
                        first: 1,
                        intervalDays: 7,
                    },
                },
                watched: {"random": new Set()},
            },
            showAll: false,
        }
    }

    updateAnimeInfo(id: string, info: Partial<AnimeInfo>) {
        this.setState((old) => {
            if (old.global.anime[id] == null) return null
            return {
                global: {
                    ...old.global,
                    anime: {
                        ...old.global.anime,
                        [id]: Object.assign(old.global.anime[id], info),
                    }
                }
            }
        });
    }

    markWatched(id: string, number: number, watched: boolean) {
        this.setState((old) => {
            if (old.global.watched[id] == null) return null
            const watchedSet = old.global.watched[id];
            const alreadyWatched = watchedSet.has(number);
            if (watched === alreadyWatched) return null
            if (watched)
                watchedSet.add(number)
            else
                watchedSet.delete(number)
            return {
                global: {
                    ...old.global,
                    watched: {
                        ...old.global.watched,
                        [id]: watchedSet,
                    }
                }
            }
        });
    }

    static sortAnime(array: { available: Date }[]) {
        array.sort((a, b) => compareDesc(a.available, b.available));
    }

    computeAnimeNumbers(): Record<string, SingleAnimeNumber[]> {
        const today = endOfDay(new Date());
        const anime = this.state.global.anime;
        const watched = this.state.global.watched;
        const result: Record<string, SingleAnimeNumber[]> = Object.create(null)

        function computeAvailableDate(index: number, info: AnimeInfo): Date {
            return addDays(info.start, index * info.intervalDays);
        }

        for (let [id, info] of Object.entries(anime)) {
            const map = new Map<number, SingleAnimeNumber>();
            const theDayNextWillBeReleased = addDays(today, info.intervalDays);

            for (const index of watched[id]) {
                map.set(index, {
                    id, index, info,
                    type: "anime",
                    available: computeAvailableDate(index, info),
                    watched: true
                })
            }

            const array: SingleAnimeNumber[] = Array.from(map.values());

            for (let index = 0; ; index++) {
                const available = computeAvailableDate(index, info)
                if (compareAsc(available, theDayNextWillBeReleased) > 0) break;
                if (map.has(index)) continue;
                array.push({
                    id, index, info, available,
                    type: "anime",
                    watched: false,
                })
            }
            App.sortAnime(array);

            result[id] = array;
        }
        return result
    }

    // AnimeNumbers which one of:
    //    not watched
    //    the latest
    //    the next
    // will be returned
    computeNotWatchedAnime(): (SingleAnimeNumber | TodayDividerMarker)[] {
        const allNumbers = this.computeAnimeNumbers();
        const shown: (SingleAnimeNumber | TodayDividerMarker)[] = [];
        for (let numbers of Object.values(allNumbers)) {
            for (const animeNumber of numbers) {
                if (!animeNumber.watched) {
                    shown.push(animeNumber)
                }
            }
            if (numbers[0]?.watched) shown.push(numbers[0])
            if (numbers[1]?.watched) shown.push(numbers[1])
        }
        shown.push(App.todayAnimeMarker());
        App.sortAnime(shown);
        return shown
    }

    computeAllAnime(): (SingleAnimeNumber | TodayDividerMarker)[] {
        const allNumbers = this.computeAnimeNumbers();
        const shown: (SingleAnimeNumber | TodayDividerMarker)[] = Object.values(allNumbers).flatMap(it => it);
        shown.push(App.todayAnimeMarker());
        App.sortAnime(shown);
        return shown
    }

    private static todayAnimeMarker(): TodayDividerMarker {
        const today = endOfDay(new Date());
        return {
            type: 'today-marker',
            available: today,
        }
    }

    render() {
        console.log(this.state.global);

        const allAnimeNumbers = this.state.showAll
            ? this.computeAllAnime()
            : this.computeNotWatchedAnime();

        return <>
            <CssBaseline/>
            <LocalizationProvider dateAdapter={DateAdapter} locale={jaLocale}>
                <FormControlLabel
                    control={<Switch
                        checked={this.state.showAll}
                        onChange={(_, all) => this.setState({showAll: all})}
                    />}
                    label={"すべて表示"}
                />
                <Table size={"small"}>
                    <TableHead>
                        <TableRow>
                            <TableCell>アニメ</TableCell>
                            <TableCell>話数</TableCell>
                            <TableCell>放送日</TableCell>
                            <TableCell>視聴済み</TableCell>
                            <TableCell>初回放送日</TableCell>
                            <TableCell>初回</TableCell>
                            <TableCell>隔日</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {allAnimeNumbers.map(animeNumber => {
                            if (animeNumber.type === 'today-marker') {
                                return <TodayDivider key={`today-marker`}/>;
                            } else {
                                return <SingleAnime
                                    key={`${animeNumber.id}-${animeNumber.index}`}
                                    number={animeNumber.index + animeNumber.info.first}
                                    available={animeNumber.available}
                                    animeInfo={animeNumber.info}
                                    updateAnimeInfo={this.updateAnimeInfo.bind(this, animeNumber.id)}
                                    watched={animeNumber.watched}
                                    markWatched={this.markWatched.bind(this, animeNumber.id, animeNumber.index)}
                                />;
                            }
                        })}
                    </TableBody>
                </Table>
                <Button>+</Button>
            </LocalizationProvider>
        </>
    }
}

function TodayDivider() {
    return <TableRow>
        <TableCell colSpan={7}>
            <div className={"TodayMarker"}>
                今日
            </div>
        </TableCell>
    </TableRow>
}

function SingleAnime(props: SingleAnimeProps) {
    return <TableRow>
        <TableCell>
            <TextField
                size={"small"}
                fullWidth
                value={props.animeInfo.name}
                onChange={(e) =>
                    props.updateAnimeInfo({name: e.target.value})}
            />
        </TableCell>
        <TableCell>{props.number}話</TableCell>
        <TableCell>{format(props.available, "yyyy/MM/dd")}</TableCell>
        <TableCell>
            <FormControlLabel control={<Checkbox
                checked={props.watched}
                onChange={(e) => props.markWatched(e.target.checked)}
            />} label={"視聴済み"}/>
        </TableCell>
        <TableCell>
            <DatePicker
                onChange={(start) => props.updateAnimeInfo({start: start!})}
                mask={"____/__/__"}
                value={props.animeInfo.start}
                renderInput={(params) => <TextField
                    {...params}
                    style={{width: "150px"}}
                    size={"small"}
                />}
            />
        </TableCell>
        <TableCell>
            <TextField
                size={"small"}
                style={{width: "100px"}}
                value={props.animeInfo.first}
                onChange={(e) =>
                    props.updateAnimeInfo({first: Number(e.target.value)})}
                inputProps={{
                    inputMode: "numeric",
                    pattern: "[0-9]*"
                }}
            />
        </TableCell>
        <TableCell>
            <TextField
                size={"small"}
                style={{width: "100px"}}
                value={props.animeInfo.intervalDays}
                onChange={(e) =>
                    props.updateAnimeInfo({intervalDays: Number(e.target.value)})}
                inputProps={{
                    inputMode: "numeric",
                    pattern: "[0-9]*"
                }}
            />
        </TableCell>
    </TableRow>
}

export default App;
