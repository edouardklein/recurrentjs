/* ===================================================================================================

  Trains the neural network

  ====================================================================================================

  Parameters:
    1 - number of neurons in the hidden layer
    2 - main data folder
    3 - flag: start fresh (TODO: implement) or continue (optional) no flag == start fresh

  Main data folder must contain
    - fortune and fortune-dat file
    - subfolder 'networks'

  ==================================================================================================== */


var R = require('./recurrent.js');
var execSync = require('exec-sync');
var fs = require('fs');

// some settings
var main_data_folder = process.argv[3];
var networks_folder = 'networks';
var save_every_tick = 5;
var max_ticks = 0;
var stopped = false;

// prediction params
var sample_softmax_temperature = 1.0; // how peaky model predictions should be
var max_chars_gen = 100; // max length of generated sentences

// model parameters
generator = 'lstm'; // can be 'rnn' or 'lstm'
hidden_sizes = [+(process.argv[2])]; // list of sizes of hidden layers
letter_size = 5; // size of letter embeddings

// optimization
regc = 0.000001; // L2 regularization strength
learning_rate = 0.01; // learning rate
clipval = 5.0; // clip gradients at this value

// various global var inits
var tick_iter = 0;
var epoch_size = -1;
var input_size = -1;
var output_size = -1;
var letterToIndex = {};
var indexToLetter = {};
var vocab = [];
var data_sents = [];
var solver = new R.Solver(); // should be class because it needs memory for step caches

var model = {};

var initVocab = function(txt, count_threshold) {
  // go over all characters and keep track of all unique ones seen

  // count up all characters
  var d = {};
  for(var i=0,n=txt.length;i<n;i++) {
    var txti = txt[i];
    if(txti in d) { d[txti] += 1; }
    else { d[txti] = 1; }
  }

  // filter by count threshold and create pointers
  letterToIndex = {};
  indexToLetter = {};
  vocab = [];
  // NOTE: start at one because we will have START and END tokens!
  // that is, START token will be index 0 in model letter vectors
  // and END token will be index 0 in the next character softmax
  var q = 1;
  for(ch in d) {
    if(d.hasOwnProperty(ch)) {
      if(d[ch] >= count_threshold) {
        // add character to vocab
        letterToIndex[ch] = q;
        indexToLetter[q] = ch;
        vocab.push(ch);
        q++;
      }
    }
  }

  // globals written: indexToLetter, letterToIndex, vocab (list), and:
  input_size = vocab.length + 1;
  output_size = vocab.length + 1;
  //epoch_size = sents.length;
  console.log('found ' + vocab.length + ' distinct characters: ' + vocab.join(''));
};

var utilAddToModel = function(modelto, modelfrom) {
  for(var k in modelfrom) {
    if(modelfrom.hasOwnProperty(k)) {
      // copy over the pointer but change the key to use the append
      modelto[k] = modelfrom[k];
    }
  }
};

var initModel = function() {
  // letter embedding vectors
  var model = {};
  model['Wil'] = new R.RandMat(input_size, letter_size , 0, 0.08);

  if(generator === 'rnn') {
    var rnn = R.initRNN(letter_size, hidden_sizes, output_size);
    utilAddToModel(model, rnn);
  } else {
    var lstm = R.initLSTM(letter_size, hidden_sizes, output_size);
    utilAddToModel(model, lstm);
  }

  return model;
};

var reinit = function(opt) {
  // note: reinit writes global vars

  // eval options to set some globals
  eval(opt);

  solver = new R.Solver(); // reinit solver

  ppl_list = [];
  tick_iter = 0;


  // initVocab(',w}hV84zmBG 2u&.(-5aKjY6ZtiloRTX{EW]QdH)nCAkMgbxJ0F[=:/1?Pq3L$sp%\'S"O!D;9e\nr+vIU7yNfc', 1); // takes count threshold for characters
  initVocab( fs.readFileSync(main_data_folder + '/text.txt', "utf8"), 1 );
  model = initModel();
};

var saveModel = function(filename) {
  var out = {};
  out['hidden_sizes'] = hidden_sizes;
  out['generator'] = generator;
  out['letter_size'] = letter_size;
  var model_out = {};
  for(var k in model) {
    if(model.hasOwnProperty(k)) {
      model_out[k] = model[k].toJSON();
    }
  }
  out['model'] = model_out;
  out['letterToIndex'] = letterToIndex;
  out['indexToLetter'] = indexToLetter;
  out['vocab'] = vocab;
  out['tick_iter'] = tick_iter;
  fs.writeFileSync(filename,JSON.stringify(out));
};

var loadModel = function(j) {
  hidden_sizes = j.hidden_sizes;
  generator = j.generator;
  letter_size = j.letter_size;
  model = {};
  for(var k in j.model) {
    if(j.model.hasOwnProperty(k)) {
      var matjson = j.model[k];
      model[k] = new R.Mat(1,1);
      model[k].fromJSON(matjson);
    }
  }
  letterToIndex = j['letterToIndex'];
  indexToLetter = j['indexToLetter'];
  vocab = j['vocab'];
  tick_iter = j['tick_iter'];

  // reinit these
  ppl_list = [];
  // tick_iter = 0;
  solver = new R.Solver(); // have to reinit the solver since model changed
};

var forwardIndex = function(G, model, ix, prev) {
  var x = G.rowPluck(model['Wil'], ix);
  var out_struct;
  // forward prop the sequence learner
  if(generator === 'rnn') {
    out_struct = R.forwardRNN(G, model, hidden_sizes, x, prev);
  } else {
    out_struct = R.forwardLSTM(G, model, hidden_sizes, x, prev);
  }
  return out_struct;
};

var predictSentence = function(model, samplei, temperature, primer) {
  if(typeof samplei === 'undefined') { samplei = false; }
  if(typeof temperature === 'undefined') { temperature = 1.0; }
  if(typeof primer === 'undefined'){ primer = ''; }

  var G = new R.Graph(false);
  var s = primer;
  var prev = {};
  var i = 0;
  while(i < max_chars_gen) {
	i += 1;

    // RNN tick
    var ix = s.length === 0 ? 0 : letterToIndex[s[s.length-1]];
    var lh = forwardIndex(G, model, ix, prev);
    prev = lh;

    // sample predicted letter
    logprobs = lh.o;
    if(temperature !== 1.0 && samplei) {
      // scale log probabilities by temperature and renormalize
      // if temperature is high, logprobs will go towards zero
      // and the softmax outputs will be more diffuse. if temperature is
      // very low, the softmax outputs will be more peaky
      for(var q=0,nq=logprobs.w.length;q<nq;q++) {
        logprobs.w[q] /= temperature;
      }
    }

    probs = R.softmax(logprobs);
    if(samplei) {
      var ix = R.samplei(probs.w);
    } else {
      var ix = R.maxi(probs.w);
    }

    if(ix === 0) break; // END token predicted, break out

    var letter = indexToLetter[ix];
    s += letter;
  }
  return s;
};

var costfun = function(model, sent) {
  // takes a model and a sentence and
  // calculates the loss. Also returns the Graph
  // object which can be used to do backprop
  var n = sent.length;
  var G = new R.Graph();
  var log2ppl = 0.0;
  var cost = 0.0;
  var prev = {};
  for(var i=-1;i<n;i++) {
    // start and end tokens are zeros
    var ix_source = i === -1 ? 0 : letterToIndex[sent[i]]; // first step: start with START token
    var ix_target = i === n-1 ? 0 : letterToIndex[sent[i+1]]; // last step: end with END token

    lh = forwardIndex(G, model, ix_source, prev);
    prev = lh;

    // set gradients into logprobabilities
    logprobs = lh.o; // interpret output as logprobs
    probs = R.softmax(logprobs); // compute the softmax probabilities

    log2ppl += -Math.log2(probs.w[ix_target]); // accumulate base 2 log prob and do smoothing
    cost += -Math.log(probs.w[ix_target]);

    // write gradients into log probabilities
    logprobs.dw = probs.w;
    logprobs.dw[ix_target] -= 1;
  }
  var ppl = Math.pow(2, log2ppl / (n - 1));
  return {'G':G, 'ppl':ppl, 'cost':cost};
};

function median(values) {
  values.sort( function(a,b) {return a - b;} );
  var half = Math.floor(values.length/2);
  if(values.length % 2) return values[half];
  else return (values[half-1] + values[half]) / 2.0;
}

var ppl_list = [];

var tick = function(sent) {

  // sample sentence fromd data
  //var sentix = R.randi(0,data_sents.length);
  //var sent = data_sents[sentix];

  var t0 = +new Date();  // log start timestamp

  // evaluate cost function on a sentence
  var cost_struct = costfun(model, sent);

  // use built up graph to compute backprop (set .dw fields in mats)
  cost_struct.G.backward();
  // perform param update
  var solver_stats = solver.step(model, learning_rate, regc, clipval);

  var t1 = +new Date();
  var tick_time = t1 - t0;

  ppl_list.push(cost_struct.ppl); // keep track of perplexity

  // evaluate now and then
  tick_iter += 1;

  // evaluate cost function on a never seen before sentence
  var cost_struct_on_unknown = costfun(model, "Most armies are in fact run by their sergeants.");
  return {
    'ppl': cost_struct.ppl,
    'cost': cost_struct.cost,
    'ppl_on_unknown': cost_struct_on_unknown.ppl,
    'cost_on_unknown': cost_struct_on_unknown.cost,
    'time': tick_time
  };
};

var getMostRecentFile = function(dir) {
  var file = false;
  var mostRecentTs = 0;
  var entries = fs.readdirSync(dir);
  var stats;
  for (var i=0; i<entries.length; i++) {
    ts = fs.statSync(dir + '/' + entries[i]).mtime.getTime();
    if (ts > mostRecentTs) {
      file = dir + '/' + entries[i];
    }
  }
  return file;
};

var logToCSV = function(data) {
  fs.appendFileSync(main_data_folder + '/log.csv', data + '\n');
};

// var exitHandler = function() {
//   console.log("STOPPED");
//   stopped = true;
//   saveModel(main_data_folder + '/' + networks_folder + '/' + 'network_' + hidden_sizes[0] + '_latest.json');
//   process.exit();
// };

var train = function() {

  var sentence = execSync('fortune ' + main_data_folder + '/text.txt');
  console.log('Sentence ' + tick_iter + ' whose length is ' + sentence.length);
  metrics = tick(sentence);
  console.log('sentence length / time: ' + sentence.length + ', ' + metrics.time);

  var sentence_soft_no_primer = predictSentence(model, true, sample_softmax_temperature);
  //var sentence_soft_primer = predictSentence(model, true, sample_softmax_temperature, "Imagination ");
  //var sentence_argmax_no_primer = predictSentence(model, false);
  //var sentence_argmax_primer = predictSentence(model, false, '', "Imagination ");

  console.log(metrics);
  console.log(sentence_soft_no_primer);
  console.log('metrics:'+[tick_iter, metrics.ppl, metrics.ppl_on_unknown, metrics.cost, metrics.cost_on_unknown].join(','));
  console.log('');

  // Log
  logToCSV([tick_iter, sentence.length, metrics.time, metrics.ppl, metrics.ppl_on_unknown].join(','));

  // Save network
  if(tick_iter % save_every_tick === 0) {
    saveModel(main_data_folder + '/' + networks_folder + '/' + 'network_' + hidden_sizes[0] + '_' + tick_iter + '.json');
    console.log("saved model.");
  }

  if (!stopped && ( max_ticks < 1 || tick_iter < max_ticks )) {
    nextTick(train());
  }
};

reinit();

// Load existing network
if (typeof process.argv[4] !== 'undefined') {
  var mostRecentNetwork = getMostRecentFile(main_data_folder + '/' + networks_folder);

  if (mostRecentNetwork.indexOf('.json') > -1) {

    console.log("Loading network from disk: " + mostRecentNetwork);
    
    var jsonModelFromDisk = fs.readFileSync(mostRecentNetwork);
    var parsedJsonModel = JSON.parse(jsonModelFromDisk);
    loadModel(parsedJsonModel);
  }
}

// go go go
train();