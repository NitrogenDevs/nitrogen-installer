const os = require('os')
const path = require('path')
const fs = require('fs').promises
const fsR = require('fs')
//const https = require('https')
const moment = require('moment')
const child_process = require('child_process')
const { ipcRenderer } = require('electron')
let modSelected
let sevenZipBin = '7z'
let javaBin = 'java'
const { https } = require('follow-redirects')
const decompress = require('decompress')
const unlink = require('fs')

function exec(prc, cbk) {
    console.log('Executing: ' + prc)
    child_process.exec(prc, cbk)
}

ipcRenderer.on('gotMod', (evt, arg) => {
    modSelected = arg
})

function unzip(zipPath, unzipToDir) {
    /*
    console.log('Unzipping: ' + zipPath)
    const zip = new StreamZip.async({ file: zipPath })
    const entriesCount = await zip.entriesCount;
    console.log(`Entries read: ${entriesCount}`);
    
    const entries = await zip.entries();
    for (const entry of Object.values(entries)) {
        const desc = entry.isDirectory ? 'directory' : `${entry.size} bytes`;
        console.log(`Entry ${entry.name}: ${desc}`);
        await zip.extract(entry.name, path.join(unzipToDir, entry.name));
    }
    
    // Do not forget to close the file once you're done
    await zip.close();
    */
    new Promise((resolve, reject) => {
       exec('"' + sevenZipBin + '" e "' + zipPath + '" -o"' + unzipToDir + '"', (err, stdout, stderr) => {
           console.log(stdout)
           resolve()
       })
    })
}

function runProcess(command) {
    return new Promise((resolve, reject) => {
        const proc = exec(command, (err, stdout, stderr) => {
            console.log(stdout)
            resolve()
        })
    })
}

function download(url, dest) {
    return new Promise((resolve, reject) => {
        console.log('Downloading: ' + url)
        const file = fsR.createWriteStream(dest)
        https.get(url, (res) => {
            res.pipe(file).on('finish', resolve)
        })
    })
}

async function writeProfile(filename, json) {
    if (!fsR.existsSync(filename)) {
        await fs.writeFile(filename, JSON.stringify({
            profiles: {
                nitrogen: json
            }
        }))
    } else {
        const raw = await fs.readFile(filename)
        const read = JSON.parse(raw)
        read.profiles.nitrogen = json
        await fs.writeFile(filename, JSON.stringify(read))
    }
}

function getMinecraftDirectory() {
    if(os.platform() === 'win32') {
        return path.join(os.userInfo().homedir, 'AppData/Roaming/.minecraft')
    } else if(os.platform() === 'darwin') {
        return path.join(os.userInfo().homedir, 'Library/Application Support/minecraft')
    } else {
        return path.join(os.userInfo().homedir, '.minecraft')
    }
}

async function applyMod(url, name) {
    const mcDir = getMinecraftDirectory()
    const fileName = path.join(mcDir, name + '.7z')

    await download(url, fileName)

    await unzip(fileName, path.join(mcDir, 'mods'))
}

async function deleteFile(filename) {
    const mcDir = getMinecraftDirectory()
    const filePath = path.join(mcDir, filename);

    fs.unlink(filePath, (err) => err ?  
        console.log(err) : console.log(filePath + "delete...")
    );
}

async function install7z() {
    const mcDir = getMinecraftDirectory()
    const tarxz = path.join(mcDir, 'sevenzip.zip')
    let sevenzip = '7zz'
    const extractTarget = path.join(mcDir, '7zzip')
    if(os.platform() === 'win32') {
        sevenzip = '7za'
        await download('https://raw.githubusercontent.com/R2turnTrue/Nitrogen/main/7z-win.zip', tarxz)
    } else if(os.platform() === 'darwin') {
        await download('https://raw.githubusercontent.com/R2turnTrue/Nitrogen/main/7z-mac.zip', tarxz)
    } else {
        await download('https://raw.githubusercontent.com/R2turnTrue/Nitrogen/main/7z-linux.zip', tarxz)
    }

    if(!fsR.existsSync(extractTarget)) {
        await fs.mkdir(extractTarget)
    }
    
    await decompress(tarxz, extractTarget)

    sevenZipBin = path.join(extractTarget, sevenzip)
}

async function installJava() {
    const mcDir = getMinecraftDirectory()
    const javaZip = path.join(mcDir, 'zulu16.zip')
    const extractTarget = path.join(mcDir, 'zulu16')

    let s

    if(os.platform() === 'win32') {
        s = 'zulu16.32.15-ca-jdk16.0.2-win_x64'
    } else if(os.platform() === 'darwin') {
        s = 'zulu16.32.15-ca-jdk16.0.2-macosx_x64'
    } else {
        s = 'zulu16.32.15-ca-jdk16.0.2-linux_x64'
    }

    javaBin = path.join(extractTarget, s, 'bin', 'java')

    if(fsR.existsSync(extractTarget)) return

    if(os.platform() === 'win32') {
        await download('https://cdn.azul.com/zulu/bin/zulu16.32.15-ca-jdk16.0.2-win_x64.zip', javaZip)
    } else if(os.platform() === 'darwin') {
        await download('https://cdn.azul.com/zulu/bin/zulu16.32.15-ca-jdk16.0.2-macosx_x64.zip', javaZip)
    } else {
        await download('https://drive.google.com/u/0/uc?export=download&confirm=hHTW&id=11EOYp2rHPzDTbvsiQWiGO_7rejZ_rMCD', javaZip)
    }

    if(!fsR.existsSync(extractTarget)) {
        await fs.mkdir(extractTarget)
    }
    
    await decompress(javaZip, extractTarget)
}

async function ready() {

    const statText = document.getElementById('statText')
    const status = document.getElementById('status')
    const mcDir = getMinecraftDirectory()
    const mods = path.join(mcDir, 'mods')
    const versions = path.join(mcDir, 'versions')
    const profile = path.join(versions, 'nitrogen-0.0.1')

    const launcherProfiles = path.join(mcDir, 'launcher_profiles.json')
    const launcherProfilesMs = path.join(mcDir, 'launcher_profiles_microsoft_store.json')

    if(!fsR.existsSync(mcDir)) {
        await fs.mkdir(mcDir)
    }

    ipcRenderer.send('getMod')

    console.log('Minecraft Directory: ' + mcDir)

    statText.innerHTML = 'Installing 7z/java...'
    await install7z()
    await installJava()

    statText.innerHTML = 'Backup before mods...'
    status.innerHTML = '1/5'
    
    if(fsR.existsSync(mods)) {
        await fs.rename(mods, path.join(mcDir, 'mods_' + moment().format('yyyy_MM_dd_hh_mm_ss')))
    }
    await fs.mkdir(mods)

    statText.innerHTML = 'Installing Loader...'
    status.innerHTML = '2/5'

    await download('https://maven.fabricmc.net/net/fabricmc/fabric-installer/0.10.2/fabric-installer-0.10.2.jar', path.join(mcDir, 'fab-i.jar'))

    if(!fsR.existsSync(versions)) {
        await fs.mkdir(versions)
    }
    if(!fsR.existsSync(profile)) {
        await fs.mkdir(profile)
    }
    
    await runProcess(`"${javaBin}" -jar "${path.join(mcDir, 'fab-i.jar')}" client -mcversion 1.17.1 -loader 0.12.8 -noprofile`)

    const date = new Date()

    statText.innerHTML = 'Creating profile...'
    status.innerHTML = '3/5'

    const versionJson = {
        id: "nitrogen-0.0.1",
        inheritsFrom: "1.17.1",
        releaseTime: date.toISOString(),
        time: date.toISOString(),
        type: "release",
        mainClass: "net.fabricmc.loader.impl.launch.knot.KnotClient",
        arguments: {
          game: [],
          jvm: [
            "-DFabricMcEmu= net.minecraft.client.main.Main "
          ]
        },
        libraries: [
          {
            name: "net.fabricmc:tiny-mappings-parser:0.3.0+build.17",
            url: "https://maven.fabricmc.net/"
          },
          {
            name: "net.fabricmc:sponge-mixin:0.10.7+mixin.0.8.4",
            url: "https://maven.fabricmc.net/"
          },
          {
            name: "net.fabricmc:tiny-remapper:0.6.0",
            url: "https://maven.fabricmc.net/"
          },
          {
            name: "net.fabricmc:access-widener:2.0.1",
            url: "https://maven.fabricmc.net/"
          },
          {
            name: "org.ow2.asm:asm:9.2",
            url: "https://maven.fabricmc.net/"
          },
          {
            name: "org.ow2.asm:asm-analysis:9.2",
            url: "https://maven.fabricmc.net/"
          },
          {
            name: "org.ow2.asm:asm-commons:9.2",
            url: "https://maven.fabricmc.net/"
          },
          {
            name: "org.ow2.asm:asm-tree:9.2",
            url: "https://maven.fabricmc.net/"
          },
          {
            name: "org.ow2.asm:asm-util:9.2",
            url: "https://maven.fabricmc.net/"
          },
          {
            name: "net.fabricmc:intermediary:1.17.1",
            url: "https://maven.fabricmc.net/"
          },
          {
            name: "net.fabricmc:fabric-loader:0.12.8",
            url: "https://maven.fabricmc.net/"
          }
        ]
    }
    const profileJson = {
        created: date.toISOString(),
        icon: require('./utils').icon,
        lastUsed: date.toISOString(),
        lastVersionId: 'nitrogen-0.0.1',
        name: 'Nitrogen',
        type: 'custom'
    }

    await fs.writeFile(path.join(profile, 'nitrogen-0.0.1.json'), JSON.stringify(versionJson))

    await writeProfile(launcherProfiles, profileJson)
    await writeProfile(launcherProfilesMs, profileJson)

    if(!fsR.existsSync(mods)) {
        await fs.mkdir(mods)
    }

    statText.innerHTML = 'Installing mods...'
    status.innerHTML = '4/5'

    await applyMod('https://raw.githubusercontent.com/R2turnTrue/Nitrogen/main/Required.7z', 'req')

    for(let i = 0; i < modSelected.length; i++) {
        const val = modSelected[i]
        if(!val) continue

        if(i === 0) {
            await applyMod('https://raw.githubusercontent.com/R2turnTrue/Nitrogen/main/Optimization.7z', 'opt')
        } else if(i === 1) {
            await applyMod('https://raw.githubusercontent.com/R2turnTrue/Nitrogen/main/Optimization_Optifine.7z', 'optf')
        } else if(i === 2) {
            await applyMod('https://raw.githubusercontent.com/R2turnTrue/Nitrogen/main/Util.7z', 'util')
        } else if(i === 3) {
            await applyMod('https://raw.githubusercontent.com/R2turnTrue/Nitrogen/main/FlagPvpAddon.7z', 'fpvp')
        }
    }

    statText.innerHTML = 'remove 7z file ...'
    status.innerHTML = '5/5'

    await deleteFile('req.7z')
    await deleteFile('sevenzip.zip')
    await deleteFile('opt.7z')
    await deleteFile('fpvp.7z')
    await deleteFile('util.7z')

    await ipcRenderer.send('fine')
}

document.onreadystatechange = (ev) => {
    if(document.readyState == "complete") {
        ready().catch((err) => {
            ipcRenderer.send('error', err.stack)
        })
    }
}
