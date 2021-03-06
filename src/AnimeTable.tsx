import React from "react";
import {addDays, compareAsc, compareDesc, endOfDay, format, startOfDay} from "date-fns";
import LocalizationProvider from "@mui/lab/LocalizationProvider";
import DateAdapter from "@mui/lab/AdapterDateFns";
import jaLocale from "date-fns/locale/ja";
import EditIcon from '@mui/icons-material/Edit';
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from '@mui/material/FormControl';
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import {DatePicker} from "@mui/lab";
import "./AnimeTable.css";
import {encode} from "base64-arraybuffer";

export type AllAnimeInfo = Record<string, AnimeInfo>

interface AnimeInfo {
    name: string,
    start: Date,
    first: number,
    intervalDays: number,
    watched: Set<number>,
}

interface SingleAnimeProps {
    number: number,
    available: Date,
    animeInfo: AnimeInfo,
    updateAnimeInfo: (update: Partial<AnimeInfo>) => void,
    watched: boolean,
    markWatched: (watched: boolean) => void,
    delete: () => void,
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

interface AnimeTableState {
    showAll: boolean,
}

interface AnimeTableProps {
    info: AllAnimeInfo,
    setInfo: (updater: (old: Readonly<AllAnimeInfo>) => AllAnimeInfo) => void,
}

class AnimeTable extends React.Component<AnimeTableProps, AnimeTableState> {
    constructor(props: AnimeTableProps) {
        super(props);
        this.state = {
            showAll: false,
        }
    }

    deleteAnime(id: string) {
        this.props.setInfo((old) => {
            const newObj = Object.assign({} as AllAnimeInfo, old);
            delete newObj[id];
            return newObj;
        });
    }

    updateAnimeInfo(id: string, info: Partial<AnimeInfo>) {
        this.props.setInfo((old) => {
            if (old[id] == null) return old
            return {
                ...old,
                [id]: Object.assign(old[id], info),
            }
        });
    }

    markWatched(id: string, number: number, watched: boolean) {
        this.props.setInfo((old) => {
            if (old[id] == null) return old
            const animeInfo = old[id];
            const alreadyWatched = animeInfo.watched.has(number);
            if (watched === alreadyWatched) return old
            if (watched)
                animeInfo.watched.add(number)
            else
                animeInfo.watched.delete(number)
            return {
                ...old,
                [id]: animeInfo,
            }
        });
    }

    static sortAnime(array: { available: Date }[]) {
        array.sort((a, b) => compareDesc(a.available, b.available));
    }

    computeAnimeNumbers(): Record<string, SingleAnimeNumber[]> {
        const today = endOfDay(new Date());
        const anime = this.props.info;
        const result: Record<string, SingleAnimeNumber[]> = Object.create(null)

        function computeAvailableDate(index: number, info: AnimeInfo): Date {
            return addDays(info.start, index * info.intervalDays);
        }

        for (let [id, info] of Object.entries(anime)) {
            const map = new Map<number, SingleAnimeNumber>();
            const theDayNextWillBeReleased = addDays(today, info.intervalDays);

            for (const index of info.watched) {
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
                if (index !== 0 && compareAsc(available, theDayNextWillBeReleased) > 0) break;
                if (map.has(index)) continue;
                array.push({
                    id, index, info, available,
                    type: "anime",
                    watched: false,
                })
            }
            AnimeTable.sortAnime(array);

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
        shown.push(AnimeTable.todayAnimeMarker());
        AnimeTable.sortAnime(shown);
        return shown
    }

    computeAllAnime(): (SingleAnimeNumber | TodayDividerMarker)[] {
        const allNumbers = this.computeAnimeNumbers();
        const shown: (SingleAnimeNumber | TodayDividerMarker)[] = Object.values(allNumbers).flatMap(it => it);
        shown.push(AnimeTable.todayAnimeMarker());
        AnimeTable.sortAnime(shown);
        return shown
    }

    private static todayAnimeMarker(): TodayDividerMarker {
        const today = endOfDay(new Date());
        return {
            type: 'today-marker',
            available: today,
        }
    }

    addNewAnime() {
        // util: random id gen
        this.props.setInfo((old) => {
            let id: string
            do id = randomStr()
            while (old[id] != null);

            return {
                ...old,
                [id]: {
                    name: `?????????${Object.keys(old).length + 1}`,
                    start: startOfDay(new Date()),
                    first: 1,
                    intervalDays: 7,
                    watched: new Set(),
                },
            }
        });
        function randomStr(): string {
            return encode(crypto.getRandomValues(new Uint8Array(9)).buffer)
        }
    }

    render() {
        console.log(this.props.info);

        const allAnimeNumbers = this.state.showAll
            ? this.computeAllAnime()
            : this.computeNotWatchedAnime();

        return <>
            <LocalizationProvider dateAdapter={DateAdapter} locale={jaLocale}>
                <div className={"AnimeTable"}>
                    <FormControlLabel
                        control={<Switch
                            checked={this.state.showAll}
                            onChange={(_, all) => this.setState({showAll: all})}
                        />}
                        label={"???????????????"}
                    />
                    <Table size={"small"}>
                        <TableHead>
                            <TableRow>
                                <TableCell/>
                                <TableCell>?????????</TableCell>
                                <TableCell>??????</TableCell>
                                <TableCell>?????????</TableCell>
                                <TableCell>????????????</TableCell>
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
                                        delete={this.deleteAnime.bind(this, animeNumber.id)}
                                    />;
                                }
                            })}
                        </TableBody>
                    </Table>
                    <Button onClick={this.addNewAnime.bind(this)}>+</Button>
                </div>
            </LocalizationProvider>
        </>
    }
}

function TodayDivider() {
    return <TableRow>
        <TableCell colSpan={7}>
            <div className={"TodayMarker"}>
                ??????
            </div>
        </TableCell>
    </TableRow>
}

function SingleAnime(props: SingleAnimeProps) {
    const [open, setOpen] = React.useState(false);
    const [deleteDialog, setDeleteDialog] = React.useState(false);

    return <TableRow>
        <TableCell className={"EditButton"}>
            <Button
                className={"MinWidth"}
                onClick={() => setOpen(true)}
            >
                <EditIcon/>
            </Button>
        </TableCell>
        <TableCell>{props.animeInfo.name}</TableCell>
        <TableCell>{props.number}???</TableCell>
        <TableCell>{format(props.available, "yyyy/MM/dd")}</TableCell>
        <TableCell>
            <FormControlLabel control={<Checkbox
                checked={props.watched}
                onChange={(e) => props.markWatched(e.target.checked)}
            />} label={"????????????"}/>
        </TableCell>
        <Dialog open={open}>
            <DialogTitle>Edit {props.animeInfo.name}</DialogTitle>
            <DialogContent>
                <FormControl
                    sx={{'& > :not(style)': { m: 1, width: '25ch' }}}
                >
                    <TextField
                        size={"small"}
                        fullWidth
                        label={"??????"}
                        value={props.animeInfo.name}
                        onChange={(e) =>
                            props.updateAnimeInfo({name: e.target.value})}
                    />
                    <DatePicker
                        onChange={(start) => props.updateAnimeInfo({start: start!})}
                        mask={"____/__/__"}
                        value={props.animeInfo.start}
                        renderInput={(params) => <TextField
                            {...params}
                            size={"small"}
                            fullWidth
                            label={"???????????????"}
                        />}
                    />
                    <TextField
                        size={"small"}
                        fullWidth
                        label={"??????"}
                        value={props.animeInfo.first}
                        onChange={(e) =>
                            props.updateAnimeInfo({first: Number(e.target.value)})}
                        inputProps={{
                            inputMode: "numeric",
                            pattern: "[0-9]*"
                        }}
                    />
                    <TextField
                        size={"small"}
                        fullWidth
                        label={"??????"}
                        value={props.animeInfo.intervalDays}
                        onChange={(e) =>
                            props.updateAnimeInfo({intervalDays: Number(e.target.value)})}
                        inputProps={{
                            inputMode: "numeric",
                            pattern: "[0-9]*"
                        }}
                    />
                </FormControl>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setDeleteDialog(true)}>
                    ??????
                </Button>
                <Button onClick={() => setOpen(false)}>
                    ?????????
                </Button>
                <Dialog open={deleteDialog}>
                    <DialogTitle>{props.animeInfo.name}????????????????????????</DialogTitle>
                    <DialogActions>
                        <Button onClick={() => props.delete()}>
                            ??????
                        </Button>
                        <Button onClick={() => setOpen(false)}>
                            ???????????????
                        </Button>
                    </DialogActions>
                </Dialog>
            </DialogActions>
        </Dialog>
    </TableRow>
}

export default AnimeTable;
