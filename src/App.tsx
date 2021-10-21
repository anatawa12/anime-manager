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
import {addDays, compareAsc, endOfDay, format} from "date-fns";

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
    id: string,
    index: number,
    available: Date,
    info: AnimeInfo,
    watched: boolean
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
                    watched: false,
                })
            }
            array.sort((a, b) => compareAsc(a.available, b.available));

            result[id] = array;
        }
        return result
    }

    // AnimeNumbers which one of:
    //    not watched
    //    the latest
    //    the next
    // will be returned
    computeNotWatchedAnime() {
        const allNumbers = this.computeAnimeNumbers();
        const shown: SingleAnimeNumber[] = [];
        for (let numbers of Object.values(allNumbers)) {
            for (const animeNumber of numbers) {
                if (!animeNumber.watched) {
                    shown.push(animeNumber)
                }
            }
            if (numbers[numbers.length - 1]?.watched) shown.push(numbers[numbers.length - 1])
            if (numbers[numbers.length - 2]?.watched) shown.push(numbers[numbers.length - 2])
        }
        shown.sort((a, b) => compareAsc(a.available, b.available))
        return shown
    }

    computeAllAnime() {
        const allNumbers = this.computeAnimeNumbers();
        const shown: SingleAnimeNumber[] = Object.values(allNumbers).flatMap(it => it);
        shown.sort((a, b) => compareAsc(a.available, b.available))
        return shown
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
                        {allAnimeNumbers.map(animeNumber => <SingleAnime
                            key={`${animeNumber.id}-${animeNumber.index}`}
                            number={animeNumber.index + animeNumber.info.first}
                            available={animeNumber.available}
                            animeInfo={animeNumber.info}
                            updateAnimeInfo={this.updateAnimeInfo.bind(this, animeNumber.id)}
                            watched={animeNumber.watched}
                            markWatched={this.markWatched.bind(this, animeNumber.id, animeNumber.index)}
                        />)}
                    </TableBody>
                </Table>
                <Button>+</Button>
            </LocalizationProvider>
        </>
    }
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
