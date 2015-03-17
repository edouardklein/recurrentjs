# Goal

The goal is to output some natural feeling sentences.

# Method

We will start with very few short sentences and a small network to try to make it work.
Once it works, we break it by giving more sentences, longer sentences etc.

# Experiment 1

The goal is to have a minimal working example, where all parameters are understood and easily accessible in the code, and the network outputs things that look like english words.

## Questions :
- What is a computable metrics that correlates well with a good looking output ?

  - The perplexity of the last few sentences we trained on (maybe a rolling window, this would allow us not to depend on any notion of epoch) should work.

- How long does the training take ?

  - A few minutes. Each tick is subsecond, each epoch is sub-minute.

- What is the letter_size parameter ?

  - I still don't know.

- Does the evaluation of costfun cause the network to change ?

  - No. It uses it, but does not modify the graph (I think).

- How does one reset the network to a blank state ?

  - The job of forwardIndex() is to set it up. It is called by tick. Each tick() call starts on a blank state.

- Could costfun be a good metrics ?

   - Costfun gives two metrics: perplexity and cost.
   - Costfun is evaluated on the sentence the tick works on, but I added some code to evaluate it on a string the network has never seen before.

## Methods

Il will remove everything that from the code that is not directly helpful. I can add it back later thanks to git.

Small network : 1 hidden layer of 10 LSTM units.

Small dataset : 10 short Terry Pratchett quotes, one sentence each, no special character, some words in common. File pratchett10.txt

Short training : 10 epochs.

I need to find a metric and see if it stabilizes. I run 10 epochs and output all available metrics.
First tick outputs e.g. :

S'EctpySdgY I.tb,MmHuwfYhlbgn

Imagination serlmSHYyniivLoto'd,sH r-sxenytthnwhltvcet oo,g-'oLIY.Lepwiepgntrdyad fanruv oInhdlsraeka

Lasts ticks sekected outputs include (Imagination was the primer) :

Imagination akaot cexla, thier.

Imagination carlmmiped bo uprins hakers.

You ares shed to,te doonht ines.

Which shows basic sentence structure (capital letter at the beginning, '.' at the end…)

I will now output the metrics value in a file in order to graph them, and see if I can devise a halting criteria.

I graphed them with python, file is :
![Graph1](Exp1_graph1.png)

 We can see that after some training, ppl goes down while ppl_uk goes up, this means that we may be overfitting the network. I'll train for more epochs to see what the effect is like on the generated strings. max_epochs goes from 10 to 40.


I ran the thing for 40 epochs,

![Graph2](Exp1_graph2.png)
![Graph1](Exp1_graph3.png)

 This is pretty clear indication of over-fitting. Some remarks, and possible halting criterion :
- As epochs go, the variance of ppl_uk increases, while the variance of ppl decreases.
- There is a point at which min(ppl_uk)>max(ppl). This could be the start of over fitting. In this run this happen at epoch 6.
- A carefully tuned variance-as-percentage-of-mean-value could make us stop when ppl converges, in this case around epoch 30.

Hand selected predicted sentences using these two criterion :
- overfitting, softmax, no primer:
  Lminschesr thmsin.
- overfitting, softmax, primer :
  Imagination anes guwarser.
- overfitting, argmax, no primer :
  Sine the the the the the the...
- overfitting, argmax, primer :
  Imagination ane the the the
- long training, softmax, no primer:
  The walde doone tiugs sasesgs coup, in tiw tu to yanglangs yers.
- long training, softmax, primer :
  Imagination ligenmens phaokes yothathat harers.
- long training, argmax, no primer :
  In mangs cothe was cathings.
- long training, argmax, primer :
  Imagination lent the was cathings.

## Results

  The code works, in that an example output :

  `In mangs cothe was cathings.`

  exhibits basic sentence structure (start with a capital, ends with a ., no misplaced punctuation) and english or english-sounding words.

  Possible stop criterion include the tipping point of the divergence between ppl and ppl_uk, of convergence of ppl within an epoch. A precise computable formulation of convergence remains to be defined.

  The code is reasonably fast.

## Future work

  Experiments need to be run to see the isolated and combined effects of :
  - working with longer sentences
  - using a larger network
  - working with more sentences

  the effects are to be studied on :

  - relevance of convergence criteria
  - computation time to convergence
  - human assessed qualitative quality of output

I suggest we start with isolated effects first.

# TODO
- Use fortune to get the sentences
- Create appropriate fortune files
  - small number of longer sentences
  - huge number of long-ish sentences
- Save the state and check the restore mechanism works.

# Experiment 2

The goal is to do away with the concept of epochs, just reading chunks from a file. If the file is huge, each chunk will probably be seen once or never, if it is small, each chunk will be seen multiple times. We keep training on sentences, but We increase the size of the dataset, and see when our small network gives up, if it does.

# Questions

Does a small network learn as well as a large one on sentences ? <-> Shall we increase the number of neurons as we increase the number of sentences (but not their size) ?

Can we learn from a set so big, it's not probable a lot of sentences will be seen twice ?

# Methods

Created a fortune file to break up the book in pieces that can be fed to the network.

Starting with the code from Exp1, make the save/restore mechanisms work.

Set up an experiment that runs for a large number of ticks, reading one sentence at a time from the book.

Set up the experiments on the server : run three different sizes of network on three different sizes of input, for the same number of ticks. Compare the perplexity graphs, compare the predicted sentences.

Mistakes on the experiment :
- `strfile` should have been rerun on the .txt file, otherwise `fortune` works weirdly (the same chunks come over and over).
- some utf8 chars (e.g. U+2014, EM DASH) do not play well with the terminal stuff over ssh, I converted everything to ASCII.

Modified the Makefile, Exp2 also tries to learn a big-ish network (100 neurons) on the whole file.
