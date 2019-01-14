// requisição Express and Socket.io
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');
var config = require('./config.js');

// o objeto que contém informações sobre os usuários ativos atualmente no site
var visitorsData = {};

app.set('port', (process.env.PORT || 3000));

// serve os ativos estáticos (js / dashboard.js e css / dashboard.css)
// do diretório public /

app.use(express.static(path.join(__dirname, 'public/')));

// serve a página index.html quando alguém visita um dos seguintes
//    2. /about
//    3. /contact
app.get(/\/(about|contact)?$/, function(req, res) {
  res.sendFile(path.join(__dirname, 'views/index.html'));
});

// exibe o painel quando alguém visita /dashboard
app.get('/dashboard', function(req, res) {
  res.sendFile(path.join(__dirname, 'views/dashboard.html'));
});

io.on('connection', function(socket) {
  if (socket.handshake.headers.host === config.host
  && socket.handshake.headers.referer.indexOf(config.host + config.dashboardEndpoint) > -1) {

  // se alguém acessa "/ dashboard", envie os dados do visitante computado
    io.emit('updated-stats', computeStats());

  }

//um usuário visitou sua página - adicione-os ao objeto de dados visitantes
  socket.on('visitor-data', function(data) {
    visitorsData[socket.id] = data;

// computa e envia dados do visitante para o painel quando um novo usuário visita nossa página
    io.emit('updated-stats', computeStats());
  });

  socket.on('disconnect', function() {
    // um usuário saiu da nossa página - remova-o do objeto visitorsData
    delete visitorsData[socket.id];

    // computa e envia dados do visitante para o painel quando um usuário sai da nossa página
    io.emit('updated-stats', computeStats());
  });
});

// função wrapper para calcular as estatísticas e retornar um objeto com as estatísticas atualizadas
function computeStats(){
  return {
    pages: computePageCounts(),
    referrers: computeRefererCounts(),
    activeUsers: getActiveUsers()
  };
}

// obter o número total de usuários em cada página do nosso site
 function computePageCounts() {
  // sample data in pageCounts object:
  // { "/": 13, "/about": 5 }
  var pageCounts = {};
  for (var key in visitorsData) {
    var page = visitorsData[key].page;
    if (page in pageCounts) {
      pageCounts[page]++;
    } else {
      pageCounts[page] = 1;
    }
  }
  return pageCounts;
}

// obtém o número total de usuários por site de referência
function computeRefererCounts() {
  // sample data in referrerCounts object:
  // { "http://twitter.com/": 3, "http://stackoverflow.com/": 6 }
  var referrerCounts = {};
  for (var key in visitorsData) {
    var referringSite = visitorsData[key].referringSite || '(direct)';
    if (referringSite in referrerCounts) {
      referrerCounts[referringSite]++;
    } else {
      referrerCounts[referringSite] = 1;
    }
  }
  return referrerCounts;
}
// obter o total de usuários ativos em nosso site
 function getActiveUsers() {
  return Object.keys(visitorsData).length;
}

http.listen(app.get('port'), function() {
  console.log('listening on *:' + app.get('port'));
});
