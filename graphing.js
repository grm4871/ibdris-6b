var canvas = document.querySelector('canvas');

cw = window.innerWidth;
canvas.width = cw;
ch = window.innerHeight;
canvas.height = ch;

var c = canvas.getContext('2d');

// GLOBAL GRAPH STATE -- I'm using a class here, but it's more like a struct
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
        // i add one extra space so that we can flush any buffer
        (input_Str + " ").forEach((c, _, _) => {
            // constants
            if ((c >= '0' && c <= '9') || c == '.') {
                constbuffer.append(c);
                return;
            } else if (constbuffer != "") { // end of constant. flush buffer
                this.tokens.concat(Tokens.CONSTANT);
                this.values.concat(parseInt(constbuffer));
                constbuffer = "";
            }
            // parens
            if (c == '(') { 
                this.tokens.concat(Tokens.LPAREN);
                this.values.concat(-1);
                return;
            } if (c == ')') {
                this.tokens.concat(Tokens.RPAREN);
                this.values.concat(-1);
                return;
            }
            // operators
            if (c == '+' || c == '-' || c == '*' || c == '/' || c == '^') {
                this.tokens.concat(Tokens.OPERATOR);
                this.values.concat(c);
                return;
            }
            // special functions or variables or syntax error
            funcbuffer.concat(c);
            if (funcbuffer == "sin" || funcbuffer == "cos" || funcbuffer == "tan") { // end of function. flush buffer
                this.tokens.concat(Tokens.SP_FUNCTION);
                this.values.concat(funcbuffer);
                funcbuffer = "";

            }
            if (c == 'x') {
                this.tokens.concat(Tokens.VARIABLE);
                this.values.concat(-1);
                return;
            }
        });
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
                newtokens.concat(Tokens.CONSTANT);
                newvalues.concat(evalSymb(innertokens, innervalues, x));
                innertokens = [];
                innervalues = [];
            }
            if (insideParen) {
                innertokens.concat(token);
                innervalues.concat(values[index]);
            } else {
                newtokens.concat(token);
                newtokens.concat(token);
            }
        }) // we now have a token set without parentheses
        tokens = newtokens;
        values = newvalues;
        // exponents
        tokens.forEach((token, index, _) => {
            if (token === Tokens.OPERATOR && index > 0 && values[index] == '^') {
                if (tokens[index-1] === Tokens.CONSTANT && tokens[index+1] === Tokens.CONSTANT) {
                    values[index] = values[index-1] ^ values[index+1];
                    tokens.pop(index-1);
                    tokens.pop(index+1);
                    tokens[index] = Tokens.CONSTANT;
                    values.pop(index-1);
                    values.pop(index+1);
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
                    tokens.pop(index-1);
                    tokens.pop(index+1);
                    tokens[index] = Tokens.CONSTANT;
                    values.pop(index-1);
                    values.pop(index+1);
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
                    tokens.pop(index-1);
                    tokens.pop(index+1);
                    tokens[index] = Tokens.CONSTANT;
                    values.pop(index-1);
                    values.pop(index+1);
                }
            }
        });
        // now, we should have a single constant symbol.
        // if not, there was an error.
        // TODO error checking
        return values[0];
    }
    evalSymb(plot.tokens, plot.values, x);
}

//window.addEventListener('keyup', function(event) {
 
function draw(graph) {
    c.clearRect(0, 0, cw, ch);
    
    graph.plots.forEach((plot, _, _) => {
        for (let i = 0; i < cw; i++) {
            evalPlot(plot, i);
        }
    });
}

var g = new Graph();
draw(g);