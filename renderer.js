const {ipcRenderer} = require('electron');

let isMaximized = false
let version = []

ipcRenderer.on('gotVersion', (evt, arg) => {
    version = arg
})

document.onreadystatechange = (event) => {
    if (document.readyState == "complete") {
        ipcRenderer.send('getVersion')
        handleWindowControls();
    }
};

window.onbeforeunload = (event) => {
    /* If window is reloaded, remove win event listeners
    (DOM element listeners get auto garbage collected but not
    Electron win listeners as the win is not dereferenced unless closed) */
    win.removeAllListeners();
}

function handleWindowControls() {
    // Make minimise/maximise/restore/close buttons work when they are clicked
    document.getElementById('min-button').addEventListener("click", event => {
        ipcRenderer.send('min')
    });

    document.getElementById('max-button').addEventListener("click", event => {
        console.log('max')
        ipcRenderer.send('max')
    });

    document.getElementById('restore-button').addEventListener("click", event => {
        ipcRenderer.send('unmax')
    });

    try {
        document.getElementById('close-button').addEventListener("click", event => {
            ipcRenderer.send('close')
        });
    } catch {}

    // Toggle maximise/restore buttons when maximisation/unmaximisation occurs
    toggleMaxRestoreButtons();
    ipcRenderer.on('maxReply', toggleMaxRestoreButtons)
    ipcRenderer.on('unmaxReply', toggleMaxRestoreButtons)

    function toggleMaxRestoreButtons(evt, args) {
        if(args === undefined) return
        isMaximized = args
        console.log(isMaximized)

        if (isMaximized) {
            document.body.classList.add('maximized');
        } else {
            document.body.classList.remove('maximized');
        }
    }

    try {
        document.getElementById('install').addEventListener("click", event => {
            const optimize = document.getElementById('optimize').checked
            const optifine = document.getElementById('optifine').checked
            const flagpvp = document.getElementById('flagpvp').checked

            if(optimize && optifine) {
                ipcRenderer.send('error', '최적화 옵션 1과 2를 동시에 선택할 수 없습니다!', false)
                return
            }

            if((optifine || flagpvp) && version[0]) {
                ipcRenderer.send('error', 'FlagPvP 애드온 또는 옵티파인은 1.18.1에서 사용할 수 없습니다!', false)
                return
            }

            ipcRenderer.send('setMod', [
                optimize,
                optifine,
                document.getElementById('util').checked,
                flagpvp
            ])
            ipcRenderer.send('goTo', 'install.html')
        });
    } catch {}
    
    try {
        document.getElementById('version').addEventListener("click", event => {
            ipcRenderer.send('goTo', 'version.html')
        });
    } catch {}

    try {
        document.getElementById('select').addEventListener("click", event => {
            ipcRenderer.send('setVersion', [
                document.getElementById('1181').checked,
                document.getElementById('1171').checked
            ])
            ipcRenderer.send('goTo', 'select.html')
        });
    } catch {}

    try {
        document.getElementById('readme').addEventListener("click", event => {
            ipcRenderer.send('goTo', 'readme.html')
        });
    } catch {}
}