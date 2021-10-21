import * as child_process from 'child_process';
import * as fs from 'fs';

const handle = await fs.promises.open("public/license-disclaimer.txt", "w");
const stream = handle.createWriteStream();

child_process.spawn("yarn", ["licenses", "generate-disclaimer"], {
    stdio: ['ignore', stream, "inherit"]
})
