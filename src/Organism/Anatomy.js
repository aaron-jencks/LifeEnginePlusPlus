const CellStates = require("./Cell/CellStates");
const BodyCellFactory = require("./Cell/BodyCells/BodyCellFactory");
const SerializeHelper = require("../Utils/SerializeHelper");

class Anatomy {
    constructor(owner) {
        this.owner = owner;
        this.birth_distance = 4;
        this.bbox = {
            left: 0, top: 0, right: 0, bottom: 0,
        }
        this.clear();
    }

    clear() {
        this.cells = [];
        this.is_producer = false;
        this.is_mover = false;
        this.has_eyes = false;
    }

    canAddCellAt(c, r) {
        for (var cell of this.cells) {
            if (cell.loc_col == c && cell.loc_row == r){
                return false;
            }
        }
        return true;
    }

    getRadius() {
        const cdiff = this.bbox.right - this.bbox.left
        const rdiff = this.bbox.bottom - this.bbox.top
        return Math.ceil(((cdiff > rdiff) ? cdiff : rdiff) / 2)
    }

    updateBbox(r, c) {
        if (c < this.bbox.left) {
            this.bbox.left = c
        }
        if (c > this.bbox.right) {
            this.bbox.right = c
        }
        if (r < this.bbox.top) {
            this.bbox.top = r
        }
        if (r > this.bbox.bottom) {
            this.bbox.bottom = r
        }
    }

    softRecalcBbox() {
        for (var i in this.cells) {
            this.updateBbox(this.cells[i].loc_row, this.cells[i].loc_col)
        }
    }

    addDefaultCell(state, c, r) {
        this.updateBbox(r, c)
        var new_cell = BodyCellFactory.createDefault(this.owner, state, c, r);
        this.cells.push(new_cell);
        return new_cell;
    }

    addRandomizedCell(state, c, r) {
        this.updateBbox(r, c)
        if (state==CellStates.eye && !this.has_eyes) {
            this.owner.brain.randomizeDecisions();
        }
        var new_cell = BodyCellFactory.createRandom(this.owner, state, c, r);
        this.cells.push(new_cell);
        return new_cell;
    }

    addInheritCell(parent_cell) {
        this.updateBbox(parent_cell.loc_row, parent_cell.loc_col)
        var new_cell = BodyCellFactory.createInherited(this.owner, parent_cell);
        this.cells.push(new_cell);
        return new_cell;
    }

    replaceCell(state, c, r, randomize=true) {
        this.removeCell(c, r, true);
        if (randomize) {
            return this.addRandomizedCell(state, c, r);
        }
        else {
            return this.addDefaultCell(state, c, r);
        }
    }

    removeCell(c, r, allow_center_removal=false) {
        if (c == 0 && r == 0 && !allow_center_removal)
            return false;
        for (var i=0; i<this.cells.length; i++) {
            var cell = this.cells[i];
            if (cell.loc_col == c && cell.loc_row == r){
                var rem = this.cells.splice(i, 1);
                if (rem.loc_col == this.bbox.left) {
                    this.bbox.left = 0
                }
                if (rem.loc_col == this.bbox.right) {
                    this.bbox.right = 0
                }
                if (rem.loc_row == this.bbox.top) {
                    this.bbox.top = 0
                }
                if (rem.loc_row == this.bbox.bottom) {
                    this.bbox.bottom = 0
                }
                this.softRecalcBbox()
                break;
            }
        }
        this.checkTypeChange();
        return true;
    }

    getLocalCell(c, r) {
        for (var cell of this.cells) {
            if (cell.loc_col == c && cell.loc_row == r){
                return cell;
            }
        }
        return null;
    }

    checkTypeChange() {
        this.is_producer = false;
        this.is_mover = false;
        this.has_eyes = false;
        for (var cell of this.cells) {
            if (cell.state == CellStates.producer)
                this.is_producer = true;
            if (cell.state == CellStates.mover)
                this.is_mover = true;
            if (cell.state == CellStates.eye)
                this.has_eyes = true;
        }
    }

    getRandomCell() {
        return this.cells[Math.floor(Math.random() * this.cells.length)];
    }

    getNeighborsOfCell(col, row) {
        var neighbors = [];
        for (var x = -1; x <= 1; x++) {
            for (var y = -1; y <= 1; y++) {

                var neighbor = this.getLocalCell(col + x, row + y);
                if (neighbor)
                    neighbors.push(neighbor)
            }
        }

        return neighbors;
    }

    isEqual(anatomy) { // currently unused helper func. inefficient, avoid usage in prod.
        if (this.cells.length !== anatomy.cells.length) return false;
        for (let i in this.cells) {
            let my_cell = this.cells[i];
            let their_cell = anatomy.cells[i];
            if (my_cell.loc_col !== their_cell.loc_col ||
                my_cell.loc_row !== their_cell.loc_row ||
                my_cell.state !== their_cell.state)
                return false;
        }
        return true;
    }

    serialize() {
        let anatomy = SerializeHelper.copyNonObjects(this);
        anatomy.cells = [];
        for (let cell of this.cells) {
            let newcell = SerializeHelper.copyNonObjects(cell);
            newcell.state = {name: cell.state.name};
            anatomy.cells.push(newcell)
        }
        return anatomy;
    }

    loadRaw(anatomy) {
        this.clear();
        for (let cell of anatomy.cells){
            this.addInheritCell(cell);
        }
    }
}

module.exports = Anatomy;