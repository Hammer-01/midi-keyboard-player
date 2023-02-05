let noteArray = [];
let volume = 1;
let piano;
let soundArray = [];
let sustain = false;
let sustainedArray = [];
let env;

function preload() {
    //piano = loadSound('piano-C4.wav');
    // soundArray.push(loadSound('https://theremin.music.uiowa.edu/sound%20files/MIS/Piano_Other/piano/Piano.ff.A0.aiff'))
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    noStroke();
    textAlign(CENTER, CENTER);
    text('Press Ctrl+Shift+J to open the console.\nClick anywhere on page to start audio', width/2, height/2);
    userStartAudio(); // enable audio playing as soon as user interacts with page

    // TODO: Use envelopes to get proper ADSR
    env = new p5.Envelope(0.0, 1, 10, 0);
    env.setExp(true);

    for (var i = 0; i < 128; i++) {
        noteArray.push(new p5.Oscillator(midiToFreq(i)));
        noteArray[i].start();
        noteArray[i].amp(0);
    }

    // Enable WebMidi.js and trigger the onWebMidiEnabled() function when ready
    WebMidi.enable()
        .then(onWebMidiEnabled)
        .catch(err => alert(err));

}

function onWebMidiEnabled() {
    // Check if at least one MIDI input is detected. If not, display warning and quit
    if (WebMidi.inputs.length < 1) {
        alert("No MIDI inputs detected.");
        return;
    }
    
    // Add a listener on all the MIDI inputs that are detected
    let keyboard = WebMidi.inputs[0];
    console.log("Found midi input: " + keyboard._midiInput.name);
    keyboard.addListener("midimessage", e => {
        // console.log(sustainedArray);
        switch (e.message.type) {
            case 'noteon':
                // console.log(e);
                // dataBytes -> [midiValueOfNote (0-127), keyPressStrength (0-127)]
                // data -> [statusByte, dataBytes[0], dataBytes[1]]
                console.log(e.dataBytes);
        
                if (e.dataBytes[0] === 7) {
                    outputVolume(e.dataBytes[1] / 127);
                    return;
                }
                
                // Add to sustainedArray if sustain pedal is pressed and key is released
                if (sustain) {
                    if (e.dataBytes[1] === 0) {
                        sustainedArray[e.dataBytes[0]] = true;
                        break;
                    }

                    // If it's already in the array, then it has just been re-pressed, so remove it from the array
                    if (sustainedArray[e.dataBytes[0]]) delete sustainedArray[e.dataBytes[0]];
                }
                

                // env.play(noteArray[e.dataBytes[0]]);

                // Play the note at a volume relative to how hard the key was pressed
                noteArray[e.dataBytes[0]].amp(e.dataBytes[1] / 127, 0.1);
                break;

            case 'controlchange':
                // console.log(e);
                switch (e.dataBytes[0]) {
                    case 7: // volume slider
                        outputVolume(e.dataBytes[1] / 127);
                        break;
                    case 64: // sustain pedal
                        sustain = !!e.dataBytes[1]; // e.dataBytes[1] = 127 if pedal pressed, else 0
                        if (!sustain) {
                            for (i in sustainedArray) { // stop each note that was sustained
                                noteArray[i].amp(0, 0.1);
                            }
                            sustainedArray = []; // reset the array
                        }
                        break;
                    default:
                        console.log('controlchange', e.dataBytes);
                }
                break;

            case 'programchange': // instrument change
                console.log('programchange', e.dataBytes);
                break;
            case 'clock':
                break;
            default:
                console.log('UNKNOWN MESSAGE TYPE: ' + e.message.type);
        }
    });
}
