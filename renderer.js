const {ipcRenderer} = require('electron');

let isMaximized = false

document.onreadystatechange = (event) => {
    if (document.readyState == "complete") {
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
        addEventListener('change', event => {
            if(document.getElementById('optifine').checked && document.getElementById('optimize').checked) {
                alert("같이 선택할 수 없습니다!");
                event.target.checked = false;
            }
        });
    } catch {}


    try {
        document.getElementById('install').addEventListener("click", event => {
            ipcRenderer.send('setMod', [
                document.getElementById('optimize').checked,
                document.getElementById('optifine').checked,
                document.getElementById('util').checked,
                document.getElementById('flagpvp').checked
            ])
            ipcRenderer.send('goTo', 'install.html')
        });
    } catch {}

    try {
        document.getElementById('select').addEventListener("click", event => {
            ipcRenderer.send('goTo', 'select.html')
        });
    } catch {}

    try {
        document.getElementById('readme').addEventListener("click", event => {
            ipcRenderer.send('goTo', 'readme.html')
        });
    } catch {}
}