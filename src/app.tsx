interface VideoMetadata {
    video: {
        creator: string;
        title: string;
        views?: string;
        likes?: string;
        thumbnail: string;
        url: string;
        color?: string[] | string | object
    };
    time: {
        curruntTime: number;
        totalTime: number;
        timePercent: number;
        formattedTime: string;
    };
    auth: {
        uuid: string;
        name: string
    };
}

const apiURL = 'http://localhost:9494/api'
const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
}
const metadata: VideoMetadata = {
    video: {
        creator: "OpenMediaShare",
        title: "Waiting For Playback",
        views: undefined,
        likes: undefined,
        thumbnail: "https://cdn.discordapp.com/avatars/877743969503682612/a90d74f19a4e5b2319303f8c90b85405.webp?size=240",
        url: "https://waterwolf.net",
        color: "WHITE"
    },
    time: {
        curruntTime: 0,
        totalTime: 0,
        timePercent: 0,
        formattedTime: "0w0"
    },
    auth: {
        name: "spicetify",
        uuid: crypto.randomUUID()
    }
}
let lastUpdate = Date.now();



async function main() {
    await fetch(`${apiURL}/auth/openSession`, {
        'headers': headers,
        'method': 'POST',
        'body': JSON.stringify(metadata)
    });


    Spicetify.Player.addEventListener('onplaypause', async (e) => {
        if (metadata.video.title === '') getVideoData(e);
        await fetch(`${apiURL}/auth/main`, {
            'headers': headers,
            'method': 'POST',
            'body': JSON.stringify(metadata)
        });
        console.log('Play Pause');
        

    })

    Spicetify.Player.addEventListener('songchange', async (e) => {
        console.log(e?.data);
        getVideoData(e);
    })

    Spicetify.Player.addEventListener('onprogress', async (e) => {
        if (metadata.video.title === '') {
            // Force Metadata Update
            Spicetify.Player.pause();
            Spicetify.Player.play();
        }
        console.log((Date.now() - lastUpdate) / 1000);
        if ((Date.now() - lastUpdate) / 1000 < 1){
            return 
        }

        const _tTime = Spicetify.Player.getDuration() / 1000;
        const _cTime = Spicetify.Player.getProgress() / 1000;
        const fct = secondsToFormat(_cTime); //formated current time
        const ftt = secondsToFormat(_tTime); //formated total time
        console.log(`${fct[0]}:${fct[1]} / ${ftt[0]}:${ftt[1]}`);
        metadata.time = {
            'curruntTime': _cTime,
            'totalTime': _tTime,
            'timePercent': (_cTime / _tTime) * 100,
            'formattedTime': `${fct[0]}:${fct[1]} / ${ftt[0]}:${ftt[1]}`
        };
        await fetch(`${apiURL}/media/all`, {
            'headers': headers,
            'method': 'POST',
            'body': JSON.stringify(metadata)
        });
        lastUpdate = Date.now()
        // await fetch(`${apiURL}/auth/openSession`,{'body': JSON.stringify(metadata),'method': 'POST'});
    })
}



async function getVideoData(e: Event & { data: Spicetify.PlayerState; } | undefined) {
    if (!e?.data) return
    metadata.video.title = e.data.item.name
    if (!e.data.item.artists) return
    metadata.video.creator = e.data.item.artists.map(a => a.name).join(', ');
    metadata.video.thumbnail = `https://i.scdn.co/image/${e.data.item.metadata.image_url.split(':')[2]}`
    metadata.video.url = 'https://waterwolf.net/404'
    metadata.video.color = Spicetify.colorExtractor(e.data.item.metadata.image_url)
    await fetch(`${apiURL}/media/all`, {
        'headers': headers,
        'method': 'POST',
        'body': JSON.stringify(metadata)
    });
}

function secondsToFormat(seconds: number) {
    const m = Math.round(Math.floor(seconds / 60));
    let s: string | number = Math.round(seconds - m * 60);
    if (s < 10) { s = `0${s}`; }
    return [m, s];
}

export default main;
