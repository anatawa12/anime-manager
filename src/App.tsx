import React from 'react';
import "./App.css";
import AnimeTable, {AllAnimeInfo} from "./AnimeTable";
import CssBaseline from "@mui/material/CssBaseline";

function App() {
    const [allAnimeInfo, setAllAnimeInfo] = React.useState<AllAnimeInfo>({})

    return <>
        <CssBaseline/>
        <AnimeTable
            info={allAnimeInfo}
            setInfo={setAllAnimeInfo}
        />
    </>
}

export default App;
