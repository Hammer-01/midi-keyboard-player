let noteArray = [];
let volume = 1;
let piano;
let soundArray = [];

function preload() {
    //piano = loadSound('piano-C4.wav');
    // soundArray.push(loadSound('https://theremin.music.uiowa.edu/sound%20files/MIS/Piano_Other/piano/Piano.ff.A0.aiff'))
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    noStroke();
    textAlign(CENTER, CENTER);
    text('Press Ctrl+Shift+J to open the console', width/2, height/2);

    for (var i = 0; i < 128; i++) {
        noteArray.push(new p5.Oscillator(midiToFreq(i)));
        noteArray[i].start();
        noteArray[i].amp(0);
    }

    // Enable WebMidi.js and trigger the onWebMidiEnabled() function when ready.
    WebMidi.enable()
        .then(onWebMidiEnabled)
        .catch(err => alert(err));

}

function onWebMidiEnabled() {
    // Check if at least one MIDI input is detected. If not, display warning and quit.
    if (WebMidi.inputs.length < 1) {
        alert("No MIDI inputs detected.");
        return;
    }
    
    // Add a listener on all the MIDI inputs that are detected
    let keyboard = WebMidi.inputs[0];
    console.log("Found midi input: " + keyboard._midiInput.name);
    keyboard.addListener("midimessage", e => {
        if (e.dataBytes != '') { // check if any input is sent
            // dataBytes -> [midiValueOfNote (0-127), keyPressStrength (0-127)]
            console.log(e.dataBytes);

            if (e.dataBytes[0] === 7) {
                outputVolume(e.dataBytes[1] / 127);
                return;
            }
            
            noteArray[e.dataBytes[0]].amp(e.dataBytes[1] / 127, 0.1);
        }
    })
}
