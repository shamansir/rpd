function Model {
    this.nodes = [];
}

function Node {
    this.name = 'Unnamed';
    this.inlets = [];
    this.outlets = [];
}

function Link {
    this.start = null;
    this.end = null;
}

function Channel {
    this.name = 'Unnamed';
    this.type = 'bool';
    this.node = null;
}
