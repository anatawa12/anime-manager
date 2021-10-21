import React from 'react';
import AnimeTable, {AllAnimeInfo} from "./AnimeTable";
import CssBaseline from "@mui/material/CssBaseline";
import {format, parse, startOfDay} from "date-fns";
import {decode, encode} from "base64-arraybuffer";

const localStorageKey = "all-anime-info"

type Serialized = {
    name: string;
    start: string;
    first: number;
    intervalDays: number;
    watched: string;
}

const todayStart = startOfDay(new Date());

function serialize(allAnimeInfo: AllAnimeInfo) {
    const result: Record<string, Serialized> = {}

    for (let [id, value] of Object.entries(allAnimeInfo)) {
        result[id] = {
            name: value.name,
            start: format(value.start, "yyyyMMdd"),
            first: value.first,
            intervalDays: value.intervalDays,
            watched: bitsToString(value.watched),
        }
    }

    return JSON.stringify(result);

    function bitsToString(bits: Iterable<number>): string {
        let bytes = new Uint8Array(2);
        for (let bit of bits) {
            const byte = Math.floor(bit / 8);
            bytes = resize(bytes, byte);
            bytes[byte] |= 0x80 >> (bit % 8);
        }
        return encode(bytes.buffer)
            .replace(/^A*/, '')
            .replace(/=*$/, '')
    }

    function resize(bytes: Uint8Array, least: number): Uint8Array {
        let length = bytes.length;
        while (least >= length) least *= 2
        if (length === bytes.length) return bytes
        const newArray = new Uint8Array(length);
        newArray.set(bytes);
        return newArray;
    }
}

const isInt = (value: any): value is number => typeof value == "number" && Number.isSafeInteger(value);
const isString = (value: any): value is string => typeof value == "string";

function deserialize(text: string): AllAnimeInfo {
    try {
        const serialized: any = JSON.parse(text);
        const result: AllAnimeInfo = {}

        for (let [id, value] of Object.entries<any>(serialized)) {
            if (isString(value.name)
                && isString(value.start)
                && isInt(value.first)
                && isInt(value.intervalDays)
                && isString(value.watched)) {
                result[id] = {
                    name: value.name,
                    start: parse(value.start, "yyyyMMdd", todayStart),
                    first: value.first,
                    intervalDays: value.intervalDays,
                    watched: stringToBits(value.watched),
                }
            }
        }

        return result
    } catch (e) {
        console.error(e);
        return {}
    }

    function stringToBits(text: string): Set<number> {
        const bits = new Set<number>();
        const paddedLen = Math.ceil(text.length / 4) * 4;
        let bytes = new Uint8Array(decode(text.padStart(paddedLen, 'A')));
        const bitCnt = bytes.length * 8;

        for (let i = 0; i < bitCnt; i++)
            if ((bytes[Math.floor(i / 8)] & (0x80 >> (i % 8))) !== 0)
                bits.add(i)
        return bits
    }
}

function App() {
    const [allAnimeInfo, setAllAnimeInfo] = React.useState<AllAnimeInfo>(() => 
        deserialize(localStorage.getItem(localStorageKey) ?? "{}"))

    if (Object.keys(allAnimeInfo).length !== 0 || localStorage.getItem(localStorageKey)){
        localStorage.setItem(localStorageKey, serialize(allAnimeInfo))
        console.log("saved")
    }

    return <>
        <CssBaseline/>
        <p>アニメやドラマを何話まで見たかを管理するツール</p>
        <p>ニコニコのような一週間無料公開なもの向けに作りました。</p>
        <p>ブラウザに入力した情報が保存されます。</p>
        <p>
            <small>&copy; anatawa12 and other contributors 2021</small>
            You can see project page on <a href={"https://github.com/anatawa12/anime-manager"}>GitHub</a>.
        </p>
        <AnimeTable
            info={allAnimeInfo}
            setInfo={setAllAnimeInfo}
        />
    </>
}

export default App;
