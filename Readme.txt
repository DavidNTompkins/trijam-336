Hello! This is the directory for a new game that we are working on. This game is a fully web html/js game that will be packaged and run on itch.io. To that end, it should use something like node for an environment. 

The game is called Body Control, and is about a tiny alien who is trying to fit in with humanity while 'piloting' a robot that looks and works like a human. It's a bit tongue in cheek and the majority of the gameplay is about responding in time to bodily cues that most humans do automatically. 
The entire game is played through what visually appears like a control console. Everything is rendered through a ascii style filter, looking either like ascii art or (more often) like the output of commands and package installations in a terminal.

I'd like this to be organized in three columns. The left and right columns contain information relating to current status and ongoing functions (breathing, beating, blinking, level of suspicion (A bar that fills up when errors are made and decays over time) etc.). The center column should contain an ASCII art video. I have a few .mp4 that I would like to use for this. We can either play that video and present it through a live filter OR please feel free to write a script to convert it to ASCII art in advance. These mp4s are things like an intro, and then two people talking (Order a coffe) or a man running (Running through the woods).

The specific cues and gameplay are below:

Core:
- Breathing (key:B) Breathing increases the oxygen bar. As oxygen gets too low, the screen starts to go dark. If it gets too high (hyperventilation) it starts to white-out.
- Heart beating (key: H) Beating needs to be done more often, and the rate should be between 60-120 bpm.
- Blinking (key: E) Blinking helps the eyes remain functional. As time between blinks goes on, the text on screen becomes more blury. However when a blink is pressed, the screen goes black for .3 seconds.

Events:
The following events occur, and each has associated controls.
Order a coffee 
- Adds the 'make eye contact' function (toggled by Key R). Both too much eye contact and too little is bad. Indicated by a red-green-red arc that goes between a closed and open eye.
- Swallow spit (key: s)- appears with a 2-3 second timer after conversation options. Indicated by a "MOUTH IS WET. SWALLOW [S]" pop up with a timer counting down
- Conversation options, madlib style ("I'd like a ___" 1: coffee, 2: frog), buttons select answer
- Failing these add suspicion. 

Running through the woods.
- Step (left: D, right: F) faster to speed up, but repeated same foot stops speed entirely.  Attempts to outrun a pursuer.
- Jump (Spacebar): appears with a 2 second timer at random (but not too often) Indicated by a "LOG AHEAD. JUMP(SPACEBAR)" OR SIMILAR OBSTACLE


I'd love it if the game had a technical feel to it, but was still fun. It should look like an imagined terminal for a high-technology flesh suit. A bit of the arcane whimsy of neon genesis evangelion might make sense as well. Please include a starting pattern that is like a terminal package install (when they have ascii art for the package or company.)