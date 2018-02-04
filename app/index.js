/*
  This is the main application serving up the blockchain data
  Then multiple node websocket process will run in tabs and be automatically updated
   as the blockchain itself udpates.
*/

/*
HTTP_PORT=3001 P2P_PORT=5001 npm run dev
HTTP_PORT=3002 P2P_PORT=5002 PEERS=ws://localhost:5001 npm run dev
HTTP_PORT=3003 P2P_PORT=5003 PEERS=ws://localhost:5001,ws://localhost:5002 npm run dev
*/
// Then sync up the peers to the most valid chain

const express = require('express');
const bodyParser = require('body-parser');
const Blockchain = require('../blockchain');
const TransactionPool = require('../wallet/transaction-pool');
const Wallet = require('../wallet');
const P2PChainServer = require('./p2p-chain-server');
const Miner = require('./miner');

const HTTP_PORT = process.env.HTTP_PORT || 3001;

const bc = new Blockchain();
const tp = new TransactionPool();
const wallet = new Wallet();
const app = express();
const p2pChainServer = new P2PChainServer(bc, tp, wallet);
const miner = new Miner(bc, tp, wallet, p2pChainServer);

app.use(bodyParser.json());

app.get('/blocks', (req, res) => {
  res.json(bc.chain);
});

app.get('/mine-transactions', (req, res) => {
  const block = miner.mine();
  console.log(`New block added: ${block.toString()}`);

  res.redirect('/blocks');
});

app.get('/balance', (req, res) => {
  res.json({ balance: wallet.calculateBalance(bc) });
});

app.post('/mine', (req, res) => {
  const block = bc.addBlock(req.body.data);
  p2pChainServer.syncChains();
  console.log(`New block added: ${block.toString()}`);

  res.redirect('/blocks');
});

app.post('/transact', (req, res) => {
  const { recipient, amount } = req.body;
  const transaction = wallet.createTransaction(recipient, amount, bc, tp);

  // store transactions on the block itself.
  p2pChainServer.broadcastTransaction(transaction);

  res.redirect('/transactions');
});

app.get('/transactions', (req, res) => {
  res.json(tp.transactions);
});

app.get('/public-key', (req, res) => {
  res.json({ publicKey: wallet.publicKey });
});

// TODO: is this ever used...? I don't think so.
app.get('/peers', (req, res) => {
  // res.json({
  //   peers: p2pChainServer.sockets.map(socket => socket._socket.address())
  // });
  res.json({ peers: p2pChainServer.sockets.length });
});

// app.post('/addPeer');

app.listen(HTTP_PORT, () => console.log(`Listening on port: ${HTTP_PORT}`));
p2pChainServer.listen();

// module.exports = bc;