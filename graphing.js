var canvas = document.querySelector('canvas');

cw = window.innerWidth;
canvas.width = cw;
ch = window.innerHeight;
canvas.height = ch;

var c = canvas.getContext('2d');

// GLOBAL GRAPH STATE -- just using this as a struct
class Graph {
    constructor() {
        this.xScale = 10;
        this.yScale = 10;
        this.plots = [];
    }
}

// PLOT DATATYPE -- Plots are stored as a sequence of tokens. We then follow PEMDAS.
const Tokens = {
    LPAREN: 0,
    RPAREN: 1,
    CONSTANT: 2,
    OPERATOR: 3,
    SP_FUNCTION: 4,
    VARIABLE: 5
}

class Plot {
    constructor(input_Str) {
        // create a token table (symbol type), and a value table (symbol metadata)
        // essentially, we are reading this as an LL1 grammar
        this.tokens = [];
        this.values = [];
        var constbuffer = "";
        var funcbuffer = "";
        // read through the string
        // i add one extra iteration so that we can flush any buffer
        for (var i = 0; i < input_Str.length + 1; i++) {
            console.log(this.tokens);
            var st = (input_Str.concat(" "))[i];
            // constants
            if ((st >= '0' && st <= '9') || st == '.') {
                constbuffer = constbuffer.concat(st);
                continue;
            } else if (constbuffer != "") { // end of constant. flush buffer
                this.tokens = this.tokens.concat(Tokens.CONSTANT);
                this.values = this.values.concat(parseInt(constbuffer));
                constbuffer = "";
            }
            // parens
            if (st == '(') { 
                this.tokens = this.tokens.concat(Tokens.LPAREN);
                this.values = this.values.concat(-1);
                continue;
            } if (st == ')') {
                this.tokens = this.tokens.concat(Tokens.RPAREN);
                this.values = this.values.concat(-1);
                continue;
            }
            // operators
            if (st == '+' || st == '-' || st == '*' || st == '/' || st == '^') {
                this.tokens = this.tokens.concat(Tokens.OPERATOR);
                this.values = this.values.concat(st);
                continue;
            }
            // special functions or variables or syntax error
            funcbuffer.concat(st);
            if (funcbuffer == "sin" || funcbuffer == "cos" || funcbuffer == "tan") { // end of function. flush buffer
                this.tokens = this.tokens.concat(Tokens.SP_FUNCTION);
                this.values = this.values.concat(funcbuffer);
                funcbuffer = "";

            }
            if (st == 'x') {
                console.log('hi');
                this.tokens = this.tokens.concat(Tokens.VARIABLE);
                this.values = this.values.concat(-1);
                continue;
            }
        }

    }
}

// evaluate a plot following PEMDAS
function evalPlot(plot, x) {
    function evalSymb(tokens, values, x) {
        // variables (i know, this isn't exactly pemdas anymore)
        tokens.forEach((token, index, _) => {
            if (token === Tokens.VARIABLE) {
                tokens[index] = Tokens.CONSTANT;
                values[index] = x;
            }
        });
        // parentheses
        var insideParen = false;
        var innertokens = [];
        var innervalues = [];        
        var newtokens = [];
        var newvalues = [];
        tokens.forEach((token, index, _) => {
            if (token === Tokens.LPAREN) {
                insideParen = true;
            } else if (token === Tokens.RPAREN) {
                insideParen = false;
                // evaluate everything inside these parens
                newtokens = newtokens.concat(Tokens.CONSTANT);
                newvalues = newvalues.concat(evalSymb(innertokens, innervalues, x));
                innertokens = [];
                innervalues = [];
            }
            // split into two lists of tokens, one inside the paren, one outside
            if (insideParen) {
                innertokens = innertokens.concat(token);
                innervalues = innervalues.concat(values[index]);
            } else {
                newtokens = newtokens.concat(token);
                newvalues = newvalues.concat(values[index]);
            }
        }) // we now have a token set without parentheses
        tokens = newtokens;
        values = newvalues;
        // exponents
        tokens.forEach((token, index, _) => {
            if (token === Tokens.OPERATOR && index > 0 && values[index] == '^') {
                if (tokens[index-1] === Tokens.CONSTANT && tokens[index+1] === Tokens.CONSTANT) {
                    values[index] = values[index-1] ** values[index+1];
                    tokens[index] = Tokens.CONSTANT;
                    tokens = tokens.slice(0,index-1).concat(tokens[index]).concat(tokens.slice(index+2, -1));
                    values = values.slice(0,index-1).concat(values[index]).concat(values.slice(index+2, -1));
                }
            }
        });
        // multiplication/division
        tokens.forEach((token, index, _) => {
            if (token === Tokens.OPERATOR && index > 0 && (values[index] == '*' || values[index] == '/')) {
                if (tokens[index-1] === Tokens.CONSTANT && tokens[index+1] === Tokens.CONSTANT) {
                    if(values[index] == '*') {
                        values[index] = values[index-1] * values[index+1];
                    } else {
                        values[index] = values[index-1]*1.0 / values[index+1];
                    }
                    tokens[index] = Tokens.CONSTANT;
                    tokens = tokens.slice(0,index-1).concat(tokens[index]).concat(tokens.slice(index+2, -1));
                    values = values.slice(0,index-1).concat(values[index]).concat(values.slice(index+2, -1));
                }
            }
        });
        // addition/subtraction
        tokens.forEach((token, index, _) => {
            if (token === Tokens.OPERATOR && index > 0 && (values[index] == '+' || values[index] == '-')) {
                if (tokens[index-1] === Tokens.CONSTANT && tokens[index+1] === Tokens.CONSTANT) {
                    if(values[index] == '+') {
                        values[index] = values[index-1] + values[index+1];
                    } else {
                        values[index] = values[index-1] - values[index+1];
                    }
                    tokens[index] = Tokens.CONSTANT;
                    tokens = tokens.slice(0,index-1).concat(tokens[index]).concat(tokens.slice(index+2, -1));
                    values = values.slice(0,index-1).concat(values[index]).concat(values.slice(index+2, -1));
                }
            }
        });
        // now, we should have a single constant symbol.
        // if not, there was an error.
        // TODO error checking
        console.log(values);
        return values[0];
    }
    return evalSymb(Array.from(plot.tokens), Array.from(plot.values), x);
}

var g = new Graph();

function graph() {
    g.plots = g.plots.concat(new Plot(document.getElementById("calcEntry").value));
    console.log(g.plots);
    draw(g);
}

function draw(graph) {
    c.clearRect(0, 0, cw, ch);
    console.log(graph);
    console.log(graph.plots);
    graph.plots.forEach(plot => {
        for (let i = 0; i < 50; i++) {
            c.lineTo(cw*i / 5, ch - evalPlot(plot, i));
            c.stroke();
        }
    });
}

