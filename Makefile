Exp1: src/test.js pratchett10.txt src/recurrent.js
	node src/test.js | tee log.txt
	grep metrics log.txt  | sed s/metrics:// > metrics.csv

Kurzweil10_1s.dat: Kurzweil10_1s.txt
	strfile Kurzweil10_1s.txt

Kurzweil_1s.dat: Kurzweil_1s.txt
	strfile Kurzweil_1s.txt

Exp2_10: src/test.js Kurzweil10_1s.txt Kurzweil10_1s.dat src/recurrent.js
	strfile Kurzweil10_1s.txt
	node src/test 10 Kurzweil10_1s.txt | tee log_10_1s.txt #First arg : number of neurons in the hidden layer, secodn arg : input fortune file.
	grep metrics log_10_1s.txt  | sed s/metrics:// > metrics_10_1s.csv

Exp2_small_inf: src/test.js Kurzweil_1s.txt Kurzweil_1s.dat src/recurrent.js
	strfile Kurzweil_1s.txt
	node src/test 10 Kurzweil_1s.txt | tee log_small_1s.txt #First arg : number of neurons in the hidden layer, secodn arg : input fortune file.
	grep metrics log_small_1s.txt  | sed s/metrics:// > metrics_small_1s.csv

Exp2_big_inf: src/test.js Kurzweil_1s.txt Kurzweil_1s.dat src/recurrent.js
	strfile Kurzweil_1s.txt
	node src/test 100 Kurzweil_1s.txt  Kurzweil_1s.txt_100_10000.json| tee log_big_1s.txt #First arg : number of neurons in the hidden layer, secodn arg : input fortune file.
	grep metrics log_big_1s.txt  | sed s/metrics:// > metrics_big_1s.csv
