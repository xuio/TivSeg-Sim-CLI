# TivSeg-sim CLI
this package provides a less cancerous interface to TivSeg-sim

### Dependencies
* `nodejs` -> `sudo pacman -S node`, `brew install node`, `sudo apt-get install nodejs`
* `npm` -> `sudo pacman -S npm`, `brew install npm`

### Installation
* `git clone https://git.tunw.net/IT-Workshop-SS2016/sim.git`
* `cd sim`
* `npm install`

### Configuration
* copy `config/default.example.json` to `config/default.json`
* Input kurs/passwort combination into `config/default.json`
* set project folder
* set files to upload

### Usage
* `node simulator.js`
* verbose output: `node simulator.js -v`
* steady simulation "aufgebockt": `node simulator.js -s`
