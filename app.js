var ITEMS_PER_PAGE = 12;
var allAnime = [];
var filteredAnime = [];
var currentPage = 1;
var currentTab = 'all';

var favorites = JSON.parse(localStorage.getItem('asl_favorites') || '[]');
var watchHistory = JSON.parse(localStorage.getItem('asl_history') || '[]');

function init() {
  updateFavCount();
  fetch('data/anime.json')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      allAnime = data.items || [];
      document.getElementById('last-updated').textContent = 'Update: ' + (data.updatedAt || 'Baru saja');
      populateGenres(allAnime);
      applyFilters();
    })
    .catch(function() {
      document.getElementById('status-msg').textContent = 'Gagal memuat katalog anime.json.';
    });

  document.getElementById('search-input').addEventListener('input', function() {
    currentPage = 1;
    applyFilters();
  });

  document.getElementById('genre-select').addEventListener('change', function() {
    currentPage = 1;
    applyFilters();
  });

  var tabs = document.querySelectorAll('.tab-btn');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener('click', function() {
      for (var j = 0; j < tabs.length; j++) tabs[j].classList.remove('active');
      this.classList.add('active');
      currentTab = this.getAttribute('data-tab');
      currentPage = 1;
      applyFilters();
    });
  }

  document.getElementById('close-modal').addEventListener('click', function() {
    document.getElementById('detail-modal').classList.add('hidden');
  });
}

function populateGenres(list) {
  var genreSet = {};
  list.forEach(function(item) {
    (item.genres || []).forEach(function(g) { genreSet[g] = true; });
  });
  var select = document.getElementById('genre-select');
  Object.keys(genreSet).sort().forEach(function(genre) {
    var opt = document.createElement('option');
    opt.value = genre;
    opt.textContent = genre;
    select.appendChild(opt);
  });
}

function applyFilters() {
  var query = document.getElementById('search-input').value.toLowerCase().trim();
  var genre = document.getElementById('genre-select').value;

  var sourceList = allAnime;
  if (currentTab === 'favorites') {
    sourceList = allAnime.filter(function(a) { return favorites.indexOf(a.id) !== -1; });
  } else if (currentTab === 'history') {
    sourceList = watchHistory.map(function(id) {
      return allAnime.find(function(a) { return a.id === id; });
    }).filter(Boolean);
  }

  filteredAnime = sourceList.filter(function(item) {
    var matchTitle = item.title.toLowerCase().indexOf(query) !== -1;
    var matchGenre = !genre || (item.genres && item.genres.indexOf(genre) !== -1);
    return matchTitle && matchGenre;
  });

  renderGrid();
  renderPagination();
}

function renderGrid() {
  var grid = document.getElementById('anime-grid');
  var status = document.getElementById('status-msg');
  grid.innerHTML = '';

  if (filteredAnime.length === 0) {
    status.textContent = 'Tidak ada anime yang ditemukan.';
    return;
  }

  status.textContent = 'Menampilkan ' + filteredAnime.length + ' judul anime.';
  var start = (currentPage - 1) * ITEMS_PER_PAGE;
  var pageItems = filteredAnime.slice(start, start + ITEMS_PER_PAGE);

  pageItems.forEach(function(anime) {
    var isFav = favorites.indexOf(anime.id) !== -1;
    var card = document.createElement('div');
    card.className = 'card';
    card.innerHTML =
      '<img src="' + anime.cover + '" alt="' + anime.title + '" loading="lazy">' +
      '<div class="card-body">' +
        '<div>' +
          '<div class="card-title">' + anime.title + '</div>' +
          '<div class="card-meta">' + (anime.episodes || '?') + ' Eps &bull; ' + (anime.status || '') + '<br>' + (anime.genres || []).slice(0, 3).join(', ') + '</div>' +
        '</div>' +
        '<div class="card-actions">' +
          '<button class="btn btn-detail" onclick="openDetail(' + anime.id + ')">Detail & Tonton</button>' +
          '<button class="btn btn-fav ' + (isFav ? 'saved' : '') + '" onclick="toggleFav(' + anime.id + ')">' + (isFav ? '♥' : '♡') + '</button>' +
        '</div>' +
      '</div>';
    grid.appendChild(card);
  });
}

function renderPagination() {
  var container = document.getElementById('pagination');
  container.innerHTML = '';
  var totalPages = Math.ceil(filteredAnime.length / ITEMS_PER_PAGE);
  if (totalPages <= 1) return;

  for (var i = 1; i <= totalPages; i++) {
    var btn = document.createElement('button');
    btn.className = 'page-btn' + (i === currentPage ? ' active' : '');
    btn.textContent = i;
    btn.setAttribute('data-page', i);
    btn.addEventListener('click', function() {
      currentPage = parseInt(this.getAttribute('data-page'), 10);
      renderGrid();
      renderPagination();
      window.scrollTo(0, 0);
    });
    container.appendChild(btn);
  }
}

function toggleFav(id) {
  var idx = favorites.indexOf(id);
  if (idx === -1) {
    favorites.push(id);
  } else {
    favorites.splice(idx, 1);
  }
  localStorage.setItem('asl_favorites', JSON.stringify(favorites));
  updateFavCount();
  applyFilters();
}

function updateFavCount() {
  document.getElementById('fav-count').textContent = favorites.length;
}

function openDetail(id) {
  var anime = allAnime.find(function(a) { return a.id === id; });
  if (!anime) return;

  // Simpan ke riwayat tontonan lokal
  watchHistory = watchHistory.filter(function(item) { return item !== id; });
  watchHistory.unshift(id);
  if (watchHistory.length > 30) watchHistory.pop();
  localStorage.setItem('asl_history', JSON.stringify(watchHistory));

  var linksHtml = '';
  if (anime.watchLinks && anime.watchLinks.length > 0) {
    anime.watchLinks.forEach(function(link) {
      linksHtml += '<a href="' + link.url + '" target="_blank" rel="noopener" class="watch-btn">▶ ' + link.site + '</a>';
    });
  } else {
    linksHtml = '<a href="' + anime.anilistUrl + '" target="_blank" rel="noopener" class="watch-btn">Lihat Info & Sumber Resmi di AniList</a>';
  }

  document.getElementById('modal-body').innerHTML =
    '<h2 style="margin-bottom:8px; color:#4ea8de;">' + anime.title + '</h2>' +
    '<p style="font-size:12px; color:#9aa0a6; margin-bottom:10px;">Status: ' + anime.status + ' | Episode: ' + (anime.episodes || '?') + ' | Skor: ' + (anime.score || '-') + '%</p>' +
    '<p style="font-size:13px; margin-bottom:12px;">' + (anime.description || 'Tidak ada sinopsis.') + '</p>' +
    '<strong>Tautan Tontonan / Sumber Resmi:</strong>' +
    '<div class="watch-links">' + linksHtml + '</div>';

  document.getElementById('detail-modal').classList.remove('hidden');
}

init();
