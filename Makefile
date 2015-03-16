Exp1: src/test.js pratchett10.txt src/recurrent.js
	node src/test.js | tee log.txt
	grep metrics log.txt  | sed s/metrics:// > metrics.csv


Exp2: src/test.js Kurzweil*.txt Kurzweil*.dat src/recurrent.js
	node  node src/test 10 Kurzweil30_1s.txt | tee log_10_30_1s.txt #First arg : number of neurons in the hidden layer, secodn arg : input fortune file.
	grep metrics log.txt  | sed s/metrics:// > metrics.csv
