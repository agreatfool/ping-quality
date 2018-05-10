ping-quality
============

Get the statistics of ping quality.

## Install
```
npm install ping-quality -g
```

## Usage
```
ping ${YOUR_IP} | ping-quality
```

Output:

```
${YOUR_IP}	31ms	Fail: 0.00%	Timeout: 0	Total: 1	Duration: 0.00 Hr	Time: 2018-05-08 19:41:46
${YOUR_IP}	32ms	Fail: 0.00%	Timeout: 0	Total: 2	Duration: 0.00 Hr	Time: 2018-05-08 19:41:47
...
${YOUR_IP}	106ms	Fail: 12.84%	Timeout: 28929	Total: 225246	Duration: 68.60 Hr	Time: 2018-05-10 17:41:40
${YOUR_IP}	108ms	Fail: 12.84%	Timeout: 28929	Total: 225247	Duration: 68.60 Hr	Time: 2018-05-10 17:41:41
${YOUR_IP}	109ms	Fail: 12.84%	Timeout: 28929	Total: 225248	Duration: 68.60 Hr	Time: 2018-05-10 17:41:42
```