import React from 'react';
import "./App.css";
import AnimeTable, {AllAnimeInfo} from "./AnimeTable";
import CssBaseline from "@mui/material/CssBaseline";

function App() {
    const [allAnimeInfo, setAllAnimeInfo] = React.useState<AllAnimeInfo>({
        "random": {
            name: "アニメ1",
            start: new Date(),
            first: 1,
            intervalDays: 7,
            watched: new Set(),
        },
    })

    return <>
        <CssBaseline/>
        <AnimeTable
            info={allAnimeInfo}
            setInfo={setAllAnimeInfo}
        />
    </>
}

export default App;
