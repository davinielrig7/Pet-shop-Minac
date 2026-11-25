
const ARQUIVO_PRODUTOS = 'produtos.json';
const API_FOTO_CAO = 'https://dog.ceo/api/breeds/image/random';
const API_FOTO_GATO = 'https://api.thecatapi.com/v1/images/search';
const QTD_DESTAQUES = 4;
const CHAVE_CARRINHO = 'minacCarrinho';
const CHAVE_ENTREGA = 'minacEntrega';
const FRETE_CASA = 20;

var produtos = [];
var catalogo = {};
var categoriaAtual = 'todos';
var textoBusca = '';

const containerDestaques = document.querySelector('#destaques-container');
const containerProdutos = document.querySelector('#produtos-container');

function formatarPreco(valor) {
    return 'R$ ' + Number(valor).toFixed(2).replace('.', ',');
}

async function buscarJson(url) {
    const resposta = await fetch(url);

    if (!resposta.ok) {
        throw new Error('Erro ao carregar os dados: ' + resposta.status);
    }

    return resposta.json();
}

function chaveProduto(produto) {
    return String(produto.id);
}

function esc(texto) {
    return String(texto ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizar(texto) {
    return String(texto ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

async function carregarCatalogo() {
    if (produtos.length) return produtos;

    produtos = await buscarJson(ARQUIVO_PRODUTOS);

    return produtos;
}

function fallbackImg(produto) {
    return produto.fallback
        ? "this.onerror=null;this.src='" + produto.fallback + "'"
        : "this.onerror=null";
}

function emEstoque(produto) {
    return produto.stock === undefined || produto.stock > 0;
}

function criarCardHtml(produto) {
    const disponivel = emEstoque(produto);

    const estoque = disponivel
        ? '<span class="badge badge-ok">✓ Em estoque</span>'
        : '<span class="badge badge-off">Sob encomenda</span>';

    const chave = chaveProduto(produto);
    const link = 'produto.html?id=' + encodeURIComponent(produto.id);

    return `
        <article class="produto-card" data-id="${esc(produto.id)}" data-categoria="${esc(produto.category)}" data-estoque="${disponivel ? 1 : 0}">
            <a class="produto-card__img" href="${link}">
                <img class="produto-imagem" src="${esc(produto.image)}" alt="${esc(produto.title)}" loading="lazy" onerror="${esc(fallbackImg(produto))}">
            </a>

            <span class="produto-card__cat produto-categoria">${esc(produto.category)}</span>
            <h3 class="produto-card__nome produto-nome">${esc(produto.title)}</h3>
            <p class="produto-card__preco produto-preco">${formatarPreco(produto.price)}</p>

            ${estoque}

            <div class="produto-card__acoes">
                <a class="btn btn-outline btn-block" href="${link}">Ver produto</a>

                <button type="button" class="btn btn-primary btn-block" data-add="${esc(chave)}">
                    🛒 Adicionar ao carrinho
                </button>
            </div>
        </article>
    `;
}

async function carregarDestaques() {
    if (!containerDestaques) return;

    try {
        const resposta = await fetch(ARQUIVO_PRODUTOS);
        const lista = await resposta.json();

        produtos = lista;

        const destaques = produtos.filter(produto => produto.destaque);

        renderizarDestaques(
            (destaques.length ? destaques : produtos).slice(0, QTD_DESTAQUES)
        );

    } catch (error) {
        console.error('Erro ao carregar os destaques:', error);

        containerDestaques.innerHTML =
            '<p class="aviso-vazio">Não foi possível carregar os destaques. Abra o site por um servidor local (ex.: Live Server).</p>';
    }
}

function renderizarDestaques(lista) {
    if (!containerDestaques) return;

    containerDestaques.innerHTML = '';

    if (lista.length === 0) {
        containerDestaques.innerHTML =
            '<p class="aviso-vazio">Nenhum produto em destaque.</p>';

        return;
    }

    lista.forEach(produto => {
        catalogo[chaveProduto(produto)] = produto;

        containerDestaques.innerHTML += criarCardHtml(produto);
    });
}

async function buscarFotoAleatoria(tipo) {
    if (tipo === 'gato') {
        const dados = await buscarJson(API_FOTO_GATO);

        return dados[0].url;
    }

    const dados = await buscarJson(API_FOTO_CAO);

    return dados.message;
}

async function iniciarFotoAleatoria() {
    const secao = document.querySelector('#foto-dia');

    if (!secao) return;

    const imagem = secao.querySelector('#foto-dia-img');
    const legenda = secao.querySelector('#foto-dia-legenda');
    const botoes = secao.querySelectorAll('[data-foto]');

    async function trocarFoto(tipo) {
        botoes.forEach(botao => {
            botao.disabled = true;
        });

        legenda.textContent = 'Buscando uma foto fofa…';

        try {
            const url = await buscarFotoAleatoria(tipo);

            await new Promise((resolver, rejeitar) => {
                imagem.onload = resolver;
                imagem.onerror = rejeitar;
                imagem.src = url;
            });

            imagem.alt = tipo === 'gato'
                ? 'Foto aleatória de um gato'
                : 'Foto aleatória de um cachorro';

            legenda.textContent = tipo === 'gato'
                ? '🐱 Um gatinho aleatório para alegrar o seu dia!'
                : '🐶 Um cachorrinho aleatório para alegrar o seu dia!';

            secao.hidden = false;

        } catch (error) {
            console.error('Erro ao buscar a foto aleatória:', error);

            if (!imagem.getAttribute('src')) {
                secao.hidden = true;
            } else {
                legenda.textContent =
                    'Não foi possível buscar outra foto agora. Tente de novo em instantes.';
            }
        }

        botoes.forEach(botao => {
            botao.disabled = false;
        });
    }

    botoes.forEach(botao => {
        botao.addEventListener('click', () => {
            trocarFoto(botao.dataset.foto);
        });
    });

    trocarFoto(Math.random() < 0.5 ? 'cao' : 'gato');
}

async function carregarProdutos() {
    if (!containerProdutos) return;

    try {
        const resposta = await fetch(ARQUIVO_PRODUTOS);

        produtos = await resposta.json();

        montarFiltros();
        iniciarCatalogo();

    } catch (error) {
        console.error('Erro ao carregar os produtos:', error);

        containerProdutos.innerHTML =
            '<p class="aviso-vazio">Não foi possível carregar os produtos. Abra o site por um servidor local (ex.: Live Server) e confira o arquivo produtos.json.</p>';
    }
}

function aplicarFiltros() {
    const produtosFiltrados = produtos.filter(produto =>
        (categoriaAtual === 'todos' || produto.category === categoriaAtual) &&
        normalizar(produto.title).includes(textoBusca)
    );

    criarCardProduto(produtosFiltrados, containerProdutos);
}

function filtrarPorCategoria(categoriaEscolhida) {
    categoriaAtual = categoriaEscolhida;

    document.querySelectorAll('[data-filtro]').forEach(link => {
        link.classList.toggle(
            'ativo',
            link.dataset.filtro === categoriaEscolhida
        );
    });

    if (categoriaEscolhida === 'todos') {
        aplicarFiltros();
    } else {
        const produtosFiltrados = produtos.filter(produto =>
            produto.category === categoriaEscolhida &&
            normalizar(produto.title).includes(textoBusca)
        );

        criarCardProduto(produtosFiltrados, containerProdutos);
    }
}

function filtrarPorNome(pesquisa) {
    textoBusca = normalizar(pesquisa).trim();

    aplicarFiltros();
}

function criarCardProduto(listaProdutos, container) {
    if (!container) return;

    container.innerHTML = '';

    if (listaProdutos.length === 0) {
        container.innerHTML =
            '<p class="aviso-vazio">Nenhum produto encontrado.</p>';

        return;
    }

    listaProdutos.forEach(produto => {
        catalogo[chaveProduto(produto)] = produto;

        container.innerHTML += criarCardHtml(produto);
    });
}

function montarFiltros() {
    const lista = document.querySelector('#filtros-categorias');

    if (!lista) return;

    lista.innerHTML = '';

    const categorias = [...new Set(produtos.map(produto => produto.category))];

    categorias.forEach(categoria => {
        const li = document.createElement('li');
        const link = document.createElement('a');

        link.href = 'produtos.html';
        link.dataset.filtro = categoria;
        link.textContent = categoria;

        li.appendChild(link);
        lista.appendChild(li);
    });

    lista.addEventListener('click', evento => {
        const link = evento.target.closest('[data-filtro]');

        if (!link) return;

        evento.preventDefault();

        filtrarPorCategoria(link.dataset.filtro);
    });

    const campo = document.querySelector('#busca-produtos');

    if (campo) {
        campo.addEventListener('input', () => {
            filtrarPorNome(campo.value);
        });
    }

    const formulario = document.querySelector('.busca-produtos');

    if (formulario) {
        formulario.addEventListener('submit', evento => {
            evento.preventDefault();
        });
    }
}

function iniciarCatalogo() {
    const parametros = new URLSearchParams(location.search);
    const pesquisa = parametros.get('q');

    if (pesquisa) {
        textoBusca = normalizar(pesquisa).trim();

        const campo = document.querySelector('#busca-produtos');

        if (campo) {
            campo.value = pesquisa;
        }
    }

    const categoria = parametros.get('categoria');

    if (categoria && produtos.some(produto => produto.category === categoria)) {
        categoriaAtual = categoria;
    }

    filtrarPorCategoria(categoriaAtual);
}

async function iniciarDetalhe() {
    const detalhe = document.querySelector('.detalhe');

    if (!detalhe) return;

    var produto;

    try {
        const parametros = new URLSearchParams(location.search);
        const lista = await carregarCatalogo();
        const id = Number(parametros.get('id')) || lista[0].id;

        produto = lista.find(item => item.id === id);

    } catch (error) {
        console.error('Erro ao carregar o produto:', error);

        detalhe.innerHTML =
            '<p class="aviso-vazio">Não foi possível carregar o produto. Abra o site por um servidor local (ex.: Live Server).</p>';

        return;
    }

    if (!produto) {
        detalhe.innerHTML =
            '<p class="aviso-vazio">Produto não encontrado. <a href="produtos.html"><strong>Ver todos os produtos</strong></a></p>';

        return;
    }

    catalogo[chaveProduto(produto)] = produto;

    const avaliacoes = produto.rating || { rate: 0, count: 0 };

    document.title = produto.title + ' — PetShop Minac';
    detalhe.dataset.id = chaveProduto(produto);
    detalhe.dataset.categoria = produto.category;

    document.querySelectorAll('.produto-nome').forEach(elemento => {
        elemento.textContent = produto.title;
    });

    const migalhaProduto = document.querySelector('.migalha-produto');

    if (migalhaProduto) {
        migalhaProduto.textContent = produto.title;
    }

    const migalhaCategoria = document.querySelector('.migalha-categoria');

    if (migalhaCategoria) {
        migalhaCategoria.textContent = produto.category;
        migalhaCategoria.href =
            'produtos.html?categoria=' + encodeURIComponent(produto.category);
    }

    const preco = document.querySelector('.produto-preco');

    if (preco) {
        preco.textContent = formatarPreco(produto.price);
    }

    const descricao = document.querySelector('.produto-descricao');

    if (descricao) {
        descricao.textContent =
            produto.description || 'Produto selecionado com carinho para o seu pet.';
    }

    document.querySelectorAll('.detalhe img').forEach(img => {
        img.onerror = () => {
            img.onerror = null;

            if (produto.fallback) {
                img.src = produto.fallback;
            }
        };

        img.src = produto.image;
        img.alt = produto.title;
    });

    const avaliacao = document.querySelector('.produto-avaliacoes');

    if (avaliacao) {
        const estrelas = Math.min(5, Math.max(0, Math.round(avaliacoes.rate)));

        avaliacao.innerHTML =
            '★'.repeat(estrelas) +
            '☆'.repeat(5 - estrelas) +
            ' <span>(' +
            (avaliacoes.count
                ? avaliacoes.count + ' avaliações'
                : 'sem avaliações ainda') +
            ')</span>';
    }

    const categoria = document.querySelector('#info-categoria');

    if (categoria) {
        categoria.textContent = produto.category;
    }

    const material = document.querySelector('#info-material');

    if (material) {
        material.textContent = produto.material || 'Não informado';
    }

    const caracteristicas = document.querySelector('#info-caracteristicas');

    if (caracteristicas) {
        caracteristicas.textContent = produto.caracteristicas || 'Não informado';
    }

    const selo = document.querySelector('.detalhe .badge');

    if (selo) {
        const disponivel = emEstoque(produto);

        selo.className = 'badge ' + (disponivel ? 'badge-ok' : 'badge-off');

        selo.textContent = disponivel
            ? '✓ Em estoque'
            : 'Sob encomenda';
    }
}

function lerCarrinho() {
    try {
        const dados = JSON.parse(localStorage.getItem(CHAVE_CARRINHO));

        return Array.isArray(dados) ? dados : [];

    } catch (error) {
        return [];
    }
}

function salvarCarrinho(carrinho) {
    try {
        localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(carrinho));

    } catch (error) {
        console.error('Não foi possível salvar o carrinho:', error);
    }

    atualizarContador();
}

function atualizarContador() {
    const total = lerCarrinho().reduce(
        (soma, item) => soma + item.qtd,
        0
    );

    document.querySelectorAll('.contador').forEach(elemento => {
        elemento.textContent = total;
    });
}

function adicionarAoCarrinho(id, qtd = 1) {
    const produto = catalogo[id];

    if (!produto) return;

    qtd = Math.min(99, Math.max(1, Number(qtd) || 1));

    const carrinho = lerCarrinho();
    const item = carrinho.find(i => String(i.id) === String(id));

    if (item) {
        item.qtd = Math.min(99, item.qtd + qtd);

    } else {
        carrinho.push({
            id: id,
            title: produto.title,
            price: produto.price,
            image: produto.image,
            qtd: qtd
        });
    }

    salvarCarrinho(carrinho);
}

function calcularTotais() {
    const carrinho = lerCarrinho();

    const subtotal = carrinho.reduce(
        (soma, item) => soma + item.price * item.qtd,
        0
    );

    const entrega = localStorage.getItem(CHAVE_ENTREGA) || 'casa';

    const frete = carrinho.length > 0 && entrega === 'casa'
        ? FRETE_CASA
        : 0;

    return {
        subtotal: subtotal,
        frete: frete,
        total: subtotal + frete,
        entrega: entrega,
        vazio: carrinho.length === 0
    };
}

function escreverTexto(seletor, texto) {
    const elemento = document.querySelector(seletor);

    if (elemento) {
        elemento.textContent = texto;
    }
}

function ativarBotoesComprar() {
    document.addEventListener('click', evento => {
        const botao = evento.target.closest('[data-add]');

        if (!botao) return;

        adicionarAoCarrinho(botao.dataset.add, 1);

        const textoOriginal = botao.textContent;

        botao.textContent = '✓ Adicionado!';

        setTimeout(() => {
            botao.textContent = textoOriginal;
        }, 1200);
    });

    const formulario = document.querySelector('.compra');

    if (formulario) {
        formulario.addEventListener('submit', evento => {
            evento.preventDefault();

            const detalhe = document.querySelector('.detalhe');

            if (!detalhe) return;

            const id = detalhe.dataset.id;

            const qtd = Math.min(99, Math.max(
                1,
                parseInt(formulario.elements['quantidade'].value, 10) || 1
            ));

            adicionarAoCarrinho(id, qtd);

            location.href = 'carrinho.html';
        });
    }
}

function renderCarrinho() {
    const corpo = document.querySelector('#carrinho-itens');

    if (!corpo) return;

    const carrinho = lerCarrinho();

    if (carrinho.length === 0) {
        corpo.innerHTML = `
            <tr>
                <td colspan="5">
                    Seu carrinho está vazio.
                    <a href="produtos.html"><strong>Ver produtos</strong></a>
                </td>
            </tr>
        `;

    } else {
        corpo.innerHTML = '';

        carrinho.forEach(item => {
            corpo.innerHTML += `
                <tr class="carrinho-item" data-id="${esc(item.id)}">
                    <td class="ci-produto">
                        <img src="${esc(item.image)}" alt="${esc(item.title)}">
                        <strong>${esc(item.title)}</strong>
                    </td>

                    <td data-label="Preço">${formatarPreco(item.price)}</td>

                    <td data-label="Quantidade">
                        <label class="qtd">
                            <span class="sr">Quantidade</span>
                            <input type="number" value="${item.qtd}" min="1" max="99">
                        </label>
                    </td>

                    <td data-label="Subtotal">
                        <strong>${formatarPreco(item.price * item.qtd)}</strong>
                    </td>

                    <td>
                        <a class="remover" href="#" aria-label="Remover ${esc(item.title)}">🗑</a>
                    </td>
                </tr>
            `;
        });
    }

    renderResumo();
}

function renderResumo() {
    const totais = calcularTotais();

    escreverTexto('#resumo-subtotal', formatarPreco(totais.subtotal));
    escreverTexto('#resumo-frete', formatarPreco(totais.frete));
    escreverTexto('#resumo-total', formatarPreco(totais.total));
}

function iniciarCarrinho() {
    const corpo = document.querySelector('#carrinho-itens');

    if (!corpo) return;

    renderCarrinho();

    corpo.addEventListener('change', evento => {
        if (!evento.target.matches('input')) return;

        const id = evento.target.closest('tr').dataset.id;
        const carrinho = lerCarrinho();
        const item = carrinho.find(i => String(i.id) === id);

        if (!item) return;

        item.qtd = Math.min(99, Math.max(
            1,
            parseInt(evento.target.value, 10) || 1
        ));

        salvarCarrinho(carrinho);
        renderCarrinho();
    });

    corpo.addEventListener('click', evento => {
        const remover = evento.target.closest('.remover');

        if (!remover) return;

        evento.preventDefault();

        const id = remover.closest('tr').dataset.id;

        const carrinhoAtualizado = lerCarrinho().filter(
            item => String(item.id) !== id
        );

        salvarCarrinho(carrinhoAtualizado);
        renderCarrinho();
    });

    const entrega = localStorage.getItem(CHAVE_ENTREGA) || 'casa';

    document.querySelectorAll('input[name="entrega"]').forEach(radio => {
        radio.checked = radio.value === entrega;

        radio.addEventListener('change', () => {
            localStorage.setItem(CHAVE_ENTREGA, radio.value);
            renderResumo();
        });
    });

    const formulario = document.querySelector('form.carrinho');

    if (formulario) {
        formulario.addEventListener('submit', evento => {
            if (lerCarrinho().length === 0) {
                evento.preventDefault();
            }
        });
    }
}

function iniciarCheckout() {
    const formulario = document.querySelector('form.checkout');

    if (!formulario) return;

    const totais = calcularTotais();

    escreverTexto('#checkout-produtos', formatarPreco(totais.subtotal));
    escreverTexto('#checkout-frete', formatarPreco(totais.frete));
    escreverTexto('#checkout-total', formatarPreco(totais.total));

    formulario.addEventListener('submit', evento => {
        evento.preventDefault();

        const totaisAtuais = calcularTotais();

        if (totaisAtuais.vazio) {
            formulario.innerHTML = `
                <section class="painel">
                    <h2>Seu carrinho está vazio</h2>
                    <a class="btn btn-primary" href="produtos.html">Ver produtos</a>
                </section>
            `;

            return;
        }

        localStorage.removeItem(CHAVE_CARRINHO);
        atualizarContador();

        document.querySelectorAll('.etapas li').forEach(li => {
            li.classList.add('ativo');
        });

        formulario.innerHTML = `
            <section class="painel">
                <h2>Pedido confirmado! 🐾</h2>
                <p>Obrigado pela compra no PetShop Minac. Seu pedido foi recebido.</p>
                <a class="btn btn-primary" href="index.html">Voltar ao início</a>
            </section>
        `;
    });
}

atualizarContador();
ativarBotoesComprar();
iniciarCarrinho();
iniciarCheckout();

carregarDestaques();
iniciarFotoAleatoria();
carregarProdutos();
iniciarDetalhe();
