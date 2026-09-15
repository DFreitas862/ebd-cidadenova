/* =========================================================
   EBD MANAGER - SUPABASE (VERSÃO CORRIGIDA)
   ========================================================= */

let supabaseClient = null;
let classes = [];
let aulas = [];
let revistas = [];

let classeAtual = null;
let aulaEditando = null;
let alunoEditando = null;

document.addEventListener("DOMContentLoaded", () => {
    const data = document.getElementById("dataDashboard");
    if (data) data.value = obterHoje();

    const dataRel = document.getElementById("dataRelatorio");
    if (dataRel) dataRel.value = obterHoje();

    if (window.supabase && typeof SUPABASE_URL !== 'undefined') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        carregarDadosDoBanco();
    } else {
        console.error("Supabase SDK ou config.js não carregados.");
    }
});

async function carregarDadosDoBanco() {
    if (!supabaseClient) return;

    try {
        const { data: dadosClasses, error: errC } = await supabaseClient
            .from('classes')
            .select('*, alunos(*)');
        if (errC) throw errC;

        classes = (dadosClasses || []).map(c => ({
            ...c,
            alunos: (c.alunos || []).map(a => ({
                ...a,
                ehProfessor: a.eh_professor,
                dataNascimento: a.data_nascimento,
                ativo: a.ativo === true || a.ativo === null || a.ativo === undefined ? true : false,
                observacoes: a.observacoes || ''
            }))
        }));

        const { data: dadosAulas, error: errA } = await supabaseClient
            .from('aulas')
            .select('*, presencas(*), alunos!aulas_professor_id_fkey(nome)');
        if (errA) throw errA;

        aulas = (dadosAulas || []).map(a => ({
            id: a.id,
            classeId: a.classe_id,
            data: a.data,
            tema: a.tema,
            professorId: a.professor_id,
            professorNome: a.alunos ? a.alunos.nome : '',
            visitantes: a.visitantes,
            oferta: a.oferta,
            presencas: (a.presencas || []).map(p => ({
                alunoId: p.aluno_id,
                status: p.status
            }))
        }));

        const { data: dadosRevistas, error: errR } = await supabaseClient
            .from('revistas_alunos')
            .select('*');
        if (errR) throw errR;
        revistas = dadosRevistas || [];

        atualizarDashboard();
        
        // Se estiver dentro de uma classe, atualiza os dados dela em tempo real
        if (classeAtual) {
            classeAtual = obterClasse(classeAtual.id);
            mostrarDadosClasse();
        }

        if (!document.getElementById("telaAlunosGeral").classList.contains("hidden")) {
            renderizarTabelaAlunosGeral();
        }
    } catch (error) {
        console.error("Erro ao carregar dados:", error);
    }
}

function gerarId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function obterHoje() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(data) {
    if (!data) return "-";
    const partes = data.split("-");
    if (partes.length !== 3) return data;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function obterClasse(id) {
    return classes.find(c => String(c.id) === String(id));
}

function esconderTodasTelas() {
    const telas = [
        "dashboard",
        "telaAlunosGeral",
        "dashboardMetricas",
        "telaClasse",
        "telaAula",
        "telaHistorico"
    ];

    telas.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.classList.add("hidden");
        }
    });
}

function voltarDashboard() {
    esconderTodasTelas();
    document.getElementById("dashboard").classList.remove("hidden");
    classeAtual = null;
    aulaEditando = null;
    alunoEditando = null;
    atualizarDashboard();
}

function atualizarDashboard() {
    mostrarEstatisticasDashboard();
    mostrarResumoDoDia();
    mostrarClasses();
}

function mostrarEstatisticasDashboard() {
    let totalAlunosAtivos = 0;
    classes.forEach(c => {
        totalAlunosAtivos += c.alunos.filter(a => a.ativo).length;
    });

    const dataSel = document.getElementById("dataDashboard")?.value || obterHoje();
    const aulasDoDia = aulas.filter(a => a.data === dataSel);

    let presencas = 0, ausentes = 0, visitantes = 0, ofertas = 0;
    aulasDoDia.forEach(a => {
        a.presencas.forEach(p => {
            if (p.status === "presente") presencas++;
            else ausentes++;
        });
        visitantes += Number(a.visitantes || 0);
        ofertas += Number(a.oferta || 0);
    });

    document.getElementById("totalClasses").textContent = classes.length;
    document.getElementById("totalAlunos").textContent = totalAlunosAtivos;
    document.getElementById("totalPresencas").textContent = presencas;
    document.getElementById("totalAusentes").textContent = ausentes;
    document.getElementById("totalVisitantes").textContent = visitantes;
    document.getElementById("totalOfertas").textContent = formatarMoeda(ofertas);
}

function mostrarResumoDoDia() {
    const container = document.getElementById("resumoDoDia");
    if (!container) return;
    const dataSel = document.getElementById("dataDashboard")?.value || obterHoje();
    const aulasDoDia = aulas.filter(a => a.data === dataSel);

    if (aulasDoDia.length === 0) {
        container.innerHTML = `<div class="daily-summary-card"><span>Aulas</span><strong>0</strong></div><div class="daily-summary-card"><span>Presenças</span><strong>0</strong></div><div class="daily-summary-card"><span>Visitantes</span><strong>0</strong></div><div class="daily-summary-card"><span>Ofertas</span><strong>R$ 0,00</strong></div>`;
        return;
    }

    let presencas = 0, visitantes = 0, ofertas = 0;
    aulasDoDia.forEach(a => {
        a.presencas.forEach(p => { if (p.status === "presente") presencas++; });
        visitantes += Number(a.visitantes || 0);
        ofertas += Number(a.oferta || 0);
    });

    container.innerHTML = `
        <div class="daily-summary-card"><span>Aulas</span><strong>${aulasDoDia.length}</strong></div>
        <div class="daily-summary-card"><span>Presenças</span><strong>${presencas}</strong></div>
        <div class="daily-summary-card"><span>Visitantes</span><strong>${visitantes}</strong></div>
        <div class="daily-summary-card"><span>Ofertas</span><strong>${formatarMoeda(ofertas)}</strong></div>
    `;
}

function mostrarClasses() {
    const container = document.getElementById("listaClasses");
    if (!container) return;
    container.innerHTML = "";

    if (classes.length === 0) {
        container.innerHTML = `<div class="empty-state">Nenhuma classe cadastrada.</div>`;
        return;
    }

    classes.forEach(c => {
        const aulasC = aulas.filter(a => String(a.classeId) === String(c.id));
        const ativos = c.alunos.filter(a => a.ativo).length;
        let presencas = 0;
        aulasC.forEach(a => a.presencas.forEach(p => { if (p.status === "presente") presencas++; }));

        container.innerHTML += `
            <div class="class-card" onclick="abrirClasse('${c.id}')">
                <div class="class-card-header">
                    <div>
                        <h3>${c.nome}</h3>
                        <div class="class-card-info">${c.dia} • ${c.horario}</div>
                    </div>
                </div>
                <div class="class-card-stats">
                    <div class="class-mini-stat"><span>Ativos</span><strong>${ativos}</strong></div>
                    <div class="class-mini-stat"><span>Aulas</span><strong>${aulasC.length}</strong></div>
                    <div class="class-mini-stat"><span>Presenças</span><strong>${presencas}</strong></div>
                </div>
            </div>
        `;
    });
}

/* =========================================================
   TELA GERAL DE ALUNOS (RANKING E ALERTA DE FALTAS)
   ========================================================= */
function abrirTelaAlunosGeral() {
    esconderTodasTelas();
    const tela = document.getElementById("telaAlunosGeral");
    if (tela) tela.classList.remove("hidden");

    const busca = document.getElementById("buscaAlunoGeral");
    if (busca) busca.value = "";

    const filtro = document.getElementById("filtroStatusAluno");
    if (filtro) filtro.value = "todos";

    renderizarTabelaAlunosGeral();
    renderizarRankingGeralEbd();
}

function calcularFaltasConsecutivasOuTotal(alunoId) {
    const aulasOrdenadas = [...aulas].sort((a, b) => b.data.localeCompare(a.data));
    let faltasContagem = 0;

    for (let aula of aulasOrdenadas) {
        const reg = aula.presencas.find(p => String(p.alunoId) === String(alunoId));
        if (reg) {
            if (reg.status === "ausente") {
                faltasContagem++;
            } else {
                break;
            }
        }
    }
    return faltasContagem;
}

function renderizarTabelaAlunosGeral() {
    const tbody = document.getElementById("tabelaAlunosGeral");
    if (!tbody) return;
    tbody.innerHTML = "";

    const busca = document.getElementById("buscaAlunoGeral")?.value.toLowerCase() || "";
    const statusFiltro = document.getElementById("filtroStatusAluno")?.value || "todos";

    let listaAlunos = [];
    classes.forEach(c => {
        if (c.alunos && Array.isArray(c.alunos)) {
            c.alunos.forEach(a => {
                const faltas = calcularFaltasConsecutivasOuTotal(a.id);
                const estaAtivo = a.ativo === true || a.ativo === null || a.ativo === undefined;
                
                listaAlunos.push({ 
                    ...a, 
                    nomeClasse: c.nome, 
                    faltasRecentes: faltas,
                    ativo: estaAtivo 
                });
            });
        }
    });

    listaAlunos = listaAlunos.filter(a => {
        const matchNome = (a.nome || "").toLowerCase().includes(busca);
        if (!matchNome) return false;

        if (statusFiltro === "ativos") return a.ativo === true;
        if (statusFiltro === "inativos") return a.ativo === false;
        if (statusFiltro === "faltosos") return a.ativo === true && a.faltasRecentes > 2;
        return true;
    });

    if (listaAlunos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Nenhum aluno encontrado.</td></tr>`;
        return;
    }

    listaAlunos.forEach(aluno => {
        const temAlerta = aluno.faltasRecentes > 2;
        const classeLinha = temAlerta ? "alerta-faltas" : "";

        tbody.innerHTML += `
            <tr class="${classeLinha}">
                <td>
                    <strong>${aluno.nome || 'Sem Nome'}</strong>
                    ${aluno.ehProfessor ? ' <small style="color:#2563eb;">(Professor)</small>' : ''}
                </td>
                <td>${aluno.nomeClasse || '-'}</td>
                <td>${aluno.telefone || '-'}</td>
                <td>
                    ${aluno.ativo ? '<span class="badge-ativo">Ativo</span>' : '<span class="badge-inativo">Inativo</span>'}
                    ${temAlerta ? `<br><span class="badge-alerta">⚠️ ${aluno.faltasRecentes} faltas seguidas</span>` : ''}
                </td>
                <td>
                    <span class="badge-obs" title="${aluno.observacoes || ''}">${aluno.observacoes || 'Nenhuma obs.'}</span>
                </td>
                <td>
                    <button class="icon-button" onclick="editarAluno('${aluno.id}')" title="Editar">✎</button>
                </td>
            </tr>
        `;
    });
}

function filtrarAlunosGeral() {
    renderizarTabelaAlunosGeral();
}

function renderizarRankingGeralEbd() {
    const container = document.getElementById("rankingGeralEbd");
    if (!container) return;
    container.innerHTML = "";

    let todosAlunosAtivos = [];
    classes.forEach(c => {
        if (c.alunos) {
            c.alunos.filter(a => a.ativo === true || a.ativo === null || a.ativo === undefined).forEach(a => {
                todosAlunosAtivos.push({ ...a, nomeClasse: c.nome });
            });
        }
    });

    if (todosAlunosAtivos.length === 0) {
        container.innerHTML = `<div class="empty-state">Nenhum aluno ativo cadastrado.</div>`;
        return;
    }

    const ranking = todosAlunosAtivos.map(aluno => {
        let presentes = 0, ausentes = 0;
        aulas.forEach(a => {
            const reg = a.presencas.find(p => String(p.alunoId) === String(aluno.id));
            if (reg) { if (reg.status === "presente") presentes++; else ausentes++; }
        });
        const total = presentes + ausentes;
        const freq = total > 0 ? (presentes / total) * 100 : 0;
        return { aluno, presentes, freq };
    });

    ranking.sort((a, b) => b.freq - a.freq);

    ranking.slice(0, 10).forEach((item, index) => {
        container.innerHTML += `
            <div class="ranking-item">
                <div class="ranking-position">${index + 1}</div>
                <div class="ranking-name">
                    <strong>${item.aluno.nome}</strong>
                    <span>${item.aluno.nomeClasse} • ${item.aluno.ehProfessor ? "Professor" : "Aluno"}</span>
                </div>
                <div class="ranking-number"><span>Presenças</span><strong>${item.presentes}</strong></div>
                <div>
                    <div class="frequency-bar"><div style="width: ${item.freq}%"></div></div>
                    <div class="ranking-number" style="margin-top:5px"><strong>${item.freq.toFixed(1)}%</strong></div>
                </div>
            </div>
        `;
    });
}

/* =========================================================
   MODAL CLASSE & EXCLUIR CLASSE
   ========================================================= */
function abrirModalClasse() {
    document.getElementById("nomeClasse").value = "";
    document.getElementById("diaClasse").value = "Domingo";
    document.getElementById("horarioClasse").value = "09:00";
    document.getElementById("modalClasse").classList.remove("hidden");
}

function fecharModalClasse() { document.getElementById("modalClasse").classList.add("hidden"); }

async function salvarClasse() {
    if (!supabaseClient) return;
    const nome = document.getElementById("nomeClasse").value.trim();
    const dia = document.getElementById("diaClasse").value;
    const horario = document.getElementById("horarioClasse").value;

    if (!nome || !horario) { alert("Preencha todos os campos."); return; }

    const nova = { id: gerarId(), nome, dia, horario };
    const { error } = await supabaseClient.from('classes').insert([nova]);
    if (error) { alert("Erro ao salvar classe."); return; }

    fecharModalClasse();
    await carregarDadosDoBanco();
}

async function excluirClasseAtual() {
    if (!supabaseClient || !classeAtual) return;
    if (!confirm(`Deseja excluir a classe "${classeAtual.nome}" e todos os seus dados?`)) return;

    const { error } = await supabaseClient.from('classes').delete().eq('id', classeAtual.id);
    if (error) { alert("Erro ao excluir classe."); return; }

    voltarDashboard();
    await carregarDadosDoBanco();
}

function abrirClasse(id) {
    const c = obterClasse(id);
    if (!c) return;
    classeAtual = c;
    esconderTodasTelas();
    document.getElementById("telaClasse").classList.remove("hidden");
    mostrarDadosClasse();
}

function mostrarDadosClasse() {
    if (!classeAtual) return;
    classeAtual = obterClasse(classeAtual.id);
    const aulasC = aulas.filter(a => String(a.classeId) === String(classeAtual.id));
    const alunosAtivos = classeAtual.alunos.filter(a => a.ativo);

    document.getElementById("tituloClasse").textContent = classeAtual.nome;
    document.getElementById("infoClasse").textContent = `${classeAtual.dia} • ${classeAtual.horario}`;
    document.getElementById("classeNomeCard").textContent = classeAtual.nome;

    let presencas = 0, ausentes = 0, visitantes = 0, ofertas = 0;
    aulasC.forEach(a => {
        a.presencas.forEach(p => { if (p.status === "presente") presencas++; else ausentes++; });
        visitantes += Number(a.visitantes || 0);
        ofertas += Number(a.oferta || 0);
    });

    const totalPossivel = alunosAtivos.length * aulasC.length;
    const freq = totalPossivel > 0 ? (presencas / totalPossivel) * 100 : 0;

    document.getElementById("classeTotalAlunos").textContent = alunosAtivos.length;
    document.getElementById("classeTotalAulas").textContent = aulasC.length;
    document.getElementById("classeTotalPresencas").textContent = presencas;
    document.getElementById("classeTotalAusentes").textContent = ausentes;
    document.getElementById("classeTotalVisitantes").textContent = visitantes;
    document.getElementById("classeTotalOfertas").textContent = formatarMoeda(ofertas);
    document.getElementById("classeFrequencia").textContent = `${freq.toFixed(1)}%`;

    document.getElementById("resumoNomeClasse").textContent = classeAtual.nome;
    document.getElementById("resumoInfoClasse").textContent = `${classeAtual.dia} • ${classeAtual.horario}`;
    document.getElementById("resumoAulas").textContent = aulasC.length;
    document.getElementById("resumoPresencas").textContent = presencas;
    document.getElementById("resumoVisitantes").textContent = visitantes;
    document.getElementById("resumoOfertas").textContent = formatarMoeda(ofertas);

    mostrarControleRevistas();
    mostrarRankingClasse();
    mostrarAulasClasse();
}

/* =========================================================
   CONTROLE DE REVISTAS POR TEMA
   ========================================================= */
async function adicionarTemaRevista() {
    if (!supabaseClient || !classeAtual) return;
    const input = document.getElementById("inputTemaRevista");
    const tema = input.value.trim();
    if (!tema) { alert("Digite o tema da revista."); return; }

    const alunosAtivos = classeAtual.alunos.filter(a => a.ativo);
    const novasRevistas = alunosAtivos.map(aluno => ({
        id: gerarId(),
        aluno_id: aluno.id,
        tema_revista: tema,
        revista_entregue: false,
        status_pagamento: 'devendo'
    }));

    if (novasRevistas.length > 0) {
        const { error } = await supabaseClient.from('revistas_alunos').insert(novasRevistas);
        if (error) { alert("Erro ao criar controle de revistas."); return; }
    }

    input.value = "";
    await carregarDadosDoBanco();
}

function mostrarControleRevistas() {
    const container = document.getElementById("listaControleRevistas");
    if (!container || !classeAtual) return;
    container.innerHTML = "";

    const alunosAtivos = classeAtual.alunos.filter(a => a.ativo);
    const alunoIdsAtivos = alunosAtivos.map(a => a.id);
    const revistasDaClasse = revistas.filter(r => alunoIdsAtivos.includes(r.aluno_id));
    const temasUnicos = [...new Set(revistasDaClasse.map(r => r.tema_revista))];

    if (temasUnicos.length === 0) {
        container.innerHTML = `<div class="empty-state">Nenhum tema de revista cadastrado para esta classe.</div>`;
        return;
    }

    temasUnicos.forEach(tema => {
        let blocoHtml = `
            <div class="revista-card-bloco">
                <div class="revista-card-topo">
                    <strong>📖 Revista: ${tema}</strong>
                    <button class="delete-button" onclick="excluirTemaRevista('${tema}')" title="Excluir tema">×</button>
                </div>
        `;

        alunosAtivos.forEach(aluno => {
            const rev = revistas.find(r => r.aluno_id === aluno.id && r.tema_revista === tema);
            const entregue = rev ? rev.revista_entregue : false;
            const pagamento = rev ? rev.status_pagamento : 'devendo';

            blocoHtml += `
                <div class="revista-aluno-row">
                    <span>${aluno.nome}</span>
                    <div class="revista-botoes-grupo">
                        <button class="btn-status ${entregue ? 'entregue' : ''}" onclick="alternarRevistaEntregue('${aluno.id}', '${tema}', ${!entregue})">
                            ${entregue ? '✓ Entregue' : '✗ Não Entregue'}
                        </button>
                        <button class="btn-status ${pagamento === 'pago' ? 'pago' : 'devendo'}" onclick="alternarStatusPagamento('${aluno.id}', '${tema}', '${pagamento === 'pago' ? 'devendo' : 'pago'}')">
                            ${pagamento === 'pago' ? '🟢 Pago' : '🔴 Devendo'}
                        </button>
                    </div>
                </div>
            `;
        });

        blocoHtml += `</div>`;
        container.innerHTML += blocoHtml;
    });
}

async function alternarRevistaEntregue(alunoId, tema, novoStatus) {
    let rev = revistas.find(r => r.aluno_id === alunoId && r.tema_revista === tema);
    if (rev) {
        await supabaseClient.from('revistas_alunos').update({ revista_entregue: novoStatus }).eq('id', rev.id);
    } else {
        await supabaseClient.from('revistas_alunos').insert([{ id: gerarId(), aluno_id: alunoId, tema_revista: tema, revista_entregue: novoStatus, status_pagamento: 'devendo' }]);
    }
    await carregarDadosDoBanco();
}

async function alternarStatusPagamento(alunoId, tema, novoStatus) {
    let rev = revistas.find(r => r.aluno_id === alunoId && r.tema_revista === tema);
    if (rev) {
        await supabaseClient.from('revistas_alunos').update({ status_pagamento: novoStatus }).eq('id', rev.id);
    } else {
        await supabaseClient.from('revistas_alunos').insert([{ id: gerarId(), aluno_id: alunoId, tema_revista: tema, revista_entregue: false, status_pagamento: novoStatus }]);
    }
    await carregarDadosDoBanco();
}

async function excluirTemaRevista(tema) {
    if (!confirm(`Deseja apagar o tema "${tema}" de todos os registros da classe?`)) return;
    const alunoIdsAtivos = classeAtual.alunos.map(a => a.id);
    for (let id of alunoIdsAtivos) {
        await supabaseClient.from('revistas_alunos').delete().eq('aluno_id', id).eq('tema_revista', tema);
    }
    await carregarDadosDoBanco();
}

/* =========================================================
   RANKING DA CLASSE
   ========================================================= */
function mostrarRankingClasse() {
    const container = document.getElementById("rankingAlunos");
    if (!container || !classeAtual) return;
    container.innerHTML = "";

    const alunosAtivos = classeAtual.alunos.filter(a => a.ativo);
    if (alunosAtivos.length === 0) {
        container.innerHTML = `<div class="empty-state">Nenhum aluno ativo.</div>`;
        return;
    }

    const aulasC = aulas.filter(a => String(a.classeId) === String(classeAtual.id));
    const ranking = alunosAtivos.map(aluno => {
        let presentes = 0, ausentes = 0;
        aulasC.forEach(a => {
            const reg = a.presencas.find(p => String(p.alunoId) === String(aluno.id));
            if (reg) { if (reg.status === "presente") presentes++; else ausentes++; }
        });
        const total = presentes + ausentes;
        const freq = total > 0 ? (presentes / total) * 100 : 0;
        return { aluno, presentes, freq };
    });

    ranking.sort((a, b) => b.freq - a.freq);
    ranking.forEach((item, index) => {
        container.innerHTML += `
            <div class="ranking-item">
                <div class="ranking-position">${index + 1}</div>
                <div class="ranking-name">
                    <strong>${item.aluno.nome}</strong>
                    <span>${item.aluno.ehProfessor ? "Professor" : "Aluno"}</span>
                </div>
                <div class="ranking-number"><span>Presenças</span><strong>${item.presentes}</strong></div>
                <div>
                    <div class="frequency-bar"><div style="width: ${item.freq}%"></div></div>
                    <div class="ranking-number" style="margin-top:5px"><strong>${item.freq.toFixed(1)}%</strong></div>
                </div>
            </div>
        `;
    });
}

function mostrarAulasClasse() {
    const container = document.getElementById("aulasClasse");
    if (!container || !classeAtual) return;
    container.innerHTML = "";

    const aulasC = aulas.filter(a => String(a.classeId) === String(classeAtual.id)).sort((a, b) => b.data.localeCompare(a.data)).slice(0, 8);
    if (aulasC.length === 0) { container.innerHTML = `<div class="empty-state">Nenhuma aula registrada.</div>`; return; }

    aulasC.forEach(aula => {
        let presencas = 0;
        aula.presencas.forEach(p => { if (p.status === "presente") presencas++; });
        container.innerHTML += `
            <div class="lesson-card">
                <div class="lesson-header">
                    <div>
                        <div class="lesson-date">${formatarData(aula.data)}</div>
                        <h3>${aula.tema || "Sem tema"}</h3>
                        <div class="lesson-professor">Professor: ${aula.professorNome || "-"}</div>
                    </div>
                </div>
                <div class="lesson-stats">
                    <div class="lesson-stat"><span>Presenças</span><strong>${presencas}</strong></div>
                    <div class="lesson-stat"><span>Visitantes</span><strong>${aula.visitantes || 0}</strong></div>
                    <div class="lesson-stat"><span>Oferta</span><strong>${formatarMoeda(aula.oferta)}</strong></div>
                </div>
                <div class="lesson-actions">
                    <button class="icon-button" title="Editar" onclick="editarAula('${aula.id}')">✎</button>
                    <button class="delete-button" title="Excluir" onclick="excluirAula('${aula.id}')">×</button>
                </div>
            </div>
        `;
    });
}

function abrirModalAluno() {
    alunoEditando = null;
    document.getElementById("tituloModalAluno").textContent = "Novo Aluno";
    document.getElementById("nomeAluno").value = "";
    document.getElementById("telefoneAluno").value = "";
    document.getElementById("dataNascimentoAluno").value = "";
    document.getElementById("observacoesAluno").value = "";
    document.getElementById("ehProfessor").checked = false;
    document.getElementById("alunoAtivo").checked = true;

    const select = document.getElementById("classeAluno");
    select.innerHTML = `<option value="">Selecione a classe</option>`;
    classes.forEach(c => { select.innerHTML += `<option value="${c.id}">${c.nome}</option>`; });
    document.getElementById("modalAluno").classList.remove("hidden");
}

function abrirModalAlunoClasseAtual() {
    abrirModalAluno();
    if (classeAtual) document.getElementById("classeAluno").value = classeAtual.id;
}

function fecharModalAluno() { document.getElementById("modalAluno").classList.add("hidden"); alunoEditando = null; }

async function salvarAluno() {
    if (!supabaseClient) return;
    const nome = document.getElementById("nomeAluno").value.trim();
    const telefone = document.getElementById("telefoneAluno").value.trim();
    const dataNascimento = document.getElementById("dataNascimentoAluno").value;
    const observacoes = document.getElementById("observacoesAluno").value.trim();
    const classeId = document.getElementById("classeAluno").value;
    const ehProfessor = document.getElementById("ehProfessor").checked;
    const ativo = document.getElementById("alunoAtivo").checked;

    if (!nome || !classeId) { alert("Preencha o nome e selecione a classe."); return; }

    if (alunoEditando) {
        const { error } = await supabaseClient.from('alunos').update({
            nome, telefone, data_nascimento: dataNascimento || null, observacoes, classe_id: classeId, eh_professor: ehProfessor, ativo
        }).eq('id', alunoEditando);
        if (error) { alert("Erro ao atualizar aluno."); return; }
    } else {
        const novo = {
            id: gerarId(), classe_id: classeId, nome, telefone, data_nascimento: dataNascimento || null, observacoes, eh_professor: ehProfessor, ativo
        };
        const { error } = await supabaseClient.from('alunos').insert([novo]);
        if (error) { alert("Erro ao salvar aluno."); return; }
    }

    fecharModalAluno();
    await carregarDadosDoBanco();
    if (classeAtual) mostrarDadosClasse();
}

function editarAluno(id) {
    let alunoObj = null, classeObj = null;
    classes.forEach(c => {
        const achou = c.alunos.find(a => String(a.id) === String(id));
        if (achou) { alunoObj = achou; classeObj = c; }
    });

    if (!alunoObj) return;
    alunoEditando = alunoObj.id;

    document.getElementById("tituloModalAluno").textContent = "Editar Aluno";
    document.getElementById("nomeAluno").value = alunoObj.nome;
    document.getElementById("telefoneAluno").value = alunoObj.telefone || "";
    document.getElementById("dataNascimentoAluno").value = alunoObj.dataNascimento || "";
    document.getElementById("observacoesAluno").value = alunoObj.observacoes || "";
    document.getElementById("ehProfessor").checked = alunoObj.ehProfessor;
    document.getElementById("alunoAtivo").checked = alunoObj.ativo;

    const select = document.getElementById("classeAluno");
    select.innerHTML = `<option value="">Selecione a classe</option>`;
    classes.forEach(c => { select.innerHTML += `<option value="${c.id}">${c.nome}</option>`; });
    select.value = classeObj.id;

    document.getElementById("modalAluno").classList.remove("hidden");
}

/* =========================================================
   AULAS E CHAMADA
   ========================================================= */
function abrirNovaAula() {
    if (!classeAtual) return;
    aulaEditando = null;
    esconderTodasTelas();
    document.getElementById("telaAula").classList.remove("hidden");
    document.getElementById("tituloAula").textContent = "Nova Aula";
    document.getElementById("subtituloAula").textContent = classeAtual.nome;
    document.getElementById("dataAula").value = obterHoje();
    document.getElementById("temaAula").value = "";
    document.getElementById("visitantesAula").value = 0;
    document.getElementById("ofertaAula").value = 0;

    carregarProfessoresGlobais();
    mostrarChamada();
}

function carregarProfessoresGlobais(sel = "") {
    const select = document.getElementById("professorAula");
    select.innerHTML = `<option value="">Selecione o professor</option>`;
    let todosProfs = [];
    classes.forEach(c => { todosProfs = todosProfs.concat(c.alunos.filter(a => a.ehProfessor && a.ativo)); });
    todosProfs.forEach(p => { select.innerHTML += `<option value="${p.id}">${p.nome}</option>`; });
    if (sel) select.value = sel;
}

function mostrarChamada(registros = []) {
    const container = document.getElementById("listaChamada");
    container.innerHTML = "";
    if (!classeAtual) return;

    const ativos = classeAtual.alunos.filter(a => a.ativo);
    if (ativos.length === 0) {
        container.innerHTML = `<div class="empty-state">Nenhum aluno ativo nesta classe para fazer chamada.</div>`;
        return;
    }

    ativos.forEach(aluno => {
        const reg = registros.find(r => String(r.alunoId) === String(aluno.id));
        const status = reg ? reg.status : "ausente";
        container.innerHTML += `
            <div class="attendance-item">
                <div class="attendance-student">
                    <div class="student-avatar">${aluno.nome.charAt(0).toUpperCase()}</div>
                    <strong>${aluno.nome}</strong>
                </div>
                <div class="attendance-buttons">
                    <button id="presente-${aluno.id}" class="attendance-btn ${status === 'presente' ? 'present' : ''}" onclick="marcarPresenca('${aluno.id}', 'presente')">✓ Presente</button>
                    <button id="ausente-${aluno.id}" class="attendance-btn ${status === 'ausente' ? 'absent' : ''}" onclick="marcarPresenca('${aluno.id}', 'ausente')">× Ausente</button>
                </div>
            </div>
        `;
    });
    atualizarContadorPresenca();
}

function marcarPresenca(alunoId, status) {
    const pres = document.getElementById(`presente-${alunoId}`);
    const aus = document.getElementById(`ausente-${alunoId}`);
    if (!pres || !aus) return;

    pres.classList.remove("present");
    aus.classList.remove("absent");
    if (status === "presente") pres.classList.add("present");
    else aus.classList.add("absent");
    atualizarContadorPresenca();
}

function atualizarContadorPresenca() {
    if (!classeAtual) return;
    let presentes = 0;
    classeAtual.alunos.filter(a => a.ativo).forEach(a => {
        if (document.getElementById(`presente-${a.id}`)?.classList.contains("present")) presentes++;
    });
    const cont = document.getElementById("contadorPresenca");
    if (cont) cont.textContent = `${presentes} presentes`;
}

async function salvarAula() {
    if (!supabaseClient || !classeAtual) return;
    const data = document.getElementById("dataAula").value;
    const tema = document.getElementById("temaAula").value.trim();
    const professorId = document.getElementById("professorAula").value;
    const visitantes = Number(document.getElementById("visitantesAula").value || 0);
    const oferta = Number(document.getElementById("ofertaAula").value || 0);

    if (!data || !tema || !professorId) { alert("Preencha data, tema e professor."); return; }

    const ativos = classeAtual.alunos.filter(a => a.ativo);
    const presencas = ativos.map(a => ({
        id: gerarId(),
        aluno_id: a.id,
        status: document.getElementById(`presente-${a.id}`)?.classList.contains("present") ? "presente" : "ausente"
    }));

    if (aulaEditando) {
        await supabaseClient.from('aulas').update({ data, tema, professor_id: professorId, visitantes, oferta }).eq('id', aulaEditando);
        await supabaseClient.from('presencas').delete().eq('aula_id', aulaEditando);
        const pSalvar = presencas.map(p => ({ id: p.id, aula_id: aulaEditando, aluno_id: p.aluno_id, status: p.status }));
        await supabaseClient.from('presencas').insert(pSalvar);
        aulaEditando = null;
    } else {
        const novaAulaId = gerarId();
        await supabaseClient.from('aulas').insert([{ id: novaAulaId, classe_id: classeAtual.id, data, tema, professor_id: professorId, visitantes, oferta }]);
        const pSalvar = presencas.map(p => ({ id: p.id, aula_id: novaAulaId, aluno_id: p.aluno_id, status: p.status }));
        await supabaseClient.from('presencas').insert(pSalvar);
    }

    await carregarDadosDoBanco();
    voltarClasse();
}

function editarAula(id) {
    const aula = aulas.find(a => String(a.id) === String(id));
    if (!aula) return;
    classeAtual = obterClasse(aula.classeId);
    aulaEditando = aula.id;

    esconderTodasTelas();
    document.getElementById("telaAula").classList.remove("hidden");
    document.getElementById("tituloAula").textContent = "Editar Aula";
    document.getElementById("subtituloAula").textContent = classeAtual.nome;
    document.getElementById("dataAula").value = aula.data;
    document.getElementById("temaAula").value = aula.tema || "";
    document.getElementById("visitantesAula").value = aula.visitantes || 0;
    document.getElementById("ofertaAula").value = aula.oferta || 0;

    carregarProfessoresGlobais(aula.professorId);
    mostrarChamada(aula.presencas || []);
}

async function excluirAula(id) {
    if (!confirm("Deseja excluir esta aula?")) return;
    await supabaseClient.from('aulas').delete().eq('id', id);
    await carregarDadosDoBanco();
    if (classeAtual) mostrarDadosClasse();
}

function voltarClasse() {
    if (!classeAtual) { voltarDashboard(); return; }
    esconderTodasTelas();
    document.getElementById("telaClasse").classList.remove("hidden");
    aulaEditando = null;
    mostrarDadosClasse();
}

function abrirHistorico() {
    if (!classeAtual) return;
    esconderTodasTelas();
    document.getElementById("telaHistorico").classList.remove("hidden");
    document.getElementById("subtituloHistorico").textContent = classeAtual.nome;
    mostrarHistorico();
}

function mostrarHistorico() {
    const container = document.getElementById("listaHistorico");
    container.innerHTML = "";
    const aulasC = aulas.filter(a => String(a.classeId) === String(classeAtual.id)).sort((a, b) => b.data.localeCompare(a.data));
    if (aulasC.length === 0) { container.innerHTML = `<div class="panel"><div class="empty-state">Nenhuma aula.</div></div>`; return; }

    aulasC.forEach(aula => {
        const pres = aula.presencas.filter(p => p.status === "presente").length;
        const aus = aula.presencas.filter(p => p.status === "ausente").length;
        container.innerHTML += `
            <div class="history-item">
                <div class="history-info">
                    <strong>${aula.tema}</strong>
                    <span>${formatarData(aula.data)} • Prof: ${aula.professorNome}</span>
                </div>
                <div class="history-stats">
                    <div class="history-stat"><span>Presentes</span><strong>${pres}</strong></div>
                    <div class="history-stat"><span>Ausentes</span><strong>${aus}</strong></div>
                    <div class="history-stat"><span>Visitantes</span><strong>${aula.visitantes || 0}</strong></div>
                    <div class="history-stat"><span>Oferta</span><strong>${formatarMoeda(aula.oferta)}</strong></div>
                    <button class="icon-button" onclick="editarAula('${aula.id}')">✎</button>
                    <button class="delete-button" onclick="excluirAula('${aula.id}')">×</button>
                </div>
            </div>
        `;
    });
}

/* =========================================================
   MÉTRICAS E RELATÓRIOS
   ========================================================= */
function abrirDashboardMetricas() {
    esconderTodasTelas();
    document.getElementById("dashboardMetricas").classList.remove("hidden");
    mudarFiltroPeriodo();
}

function mudarFiltroPeriodo() {
    const periodo = document.getElementById("filtroPeriodo").value;
    document.getElementById("grupoDataEspecifica").style.display = periodo === "dia" ? "block" : "none";
    calcularRelatorioPeriodo();
}

function calcularRelatorioPeriodo() {
    const periodo = document.getElementById("filtroPeriodo").value;
    const dataRefStr = document.getElementById("dataRelatorio").value || obterHoje();
    const dataRef = new Date(dataRefStr + "T00:00:00");

    let aulasFiltradas = aulas.filter(aula => {
        if (!aula.data) return false;
        const d = new Date(aula.data + "T00:00:00");
        if (periodo === "dia") return aula.data === dataRefStr;
        if (periodo === "semana") {
            const inicio = new Date(dataRef); inicio.setDate(dataRef.getDate() - dataRef.getDay());
            const fim = new Date(inicio); fim.setDate(inicio.getDate() + 6);
            return d >= inicio && d <= fim;
        }
        if (periodo === "mes") return d.getFullYear() === dataRef.getFullYear() && d.getMonth() === dataRef.getMonth();
        if (periodo === "trimestre") {
            return d.getFullYear() === dataRef.getFullYear() && Math.floor(d.getMonth() / 3) === Math.floor(dataRef.getMonth() / 3);
        }
        return false;
    });

    const tbody = document.getElementById("tabelaRelatorioClasses");
    tbody.innerHTML = "";

    let tMat = 0, tPres = 0, tAus = 0, tVis = 0, tOfe = 0;
    classes.forEach(c => {
        const aulasC = aulasFiltradas.filter(a => String(a.classeId) === String(c.id));
        const matriculadosAtivos = c.alunos.filter(a => a.ativo).length;
        let pres = 0, aus = 0, vis = 0, ofe = 0;

        aulasC.forEach(a => {
            vis += Number(a.visitantes || 0);
            ofe += Number(a.oferta || 0);
            a.presencas.forEach(p => { if (p.status === "presente") pres++; else aus++; });
        });

        tMat += matriculadosAtivos; tPres += pres; tAus += aus; tVis += vis; tOfe += ofe;

        tbody.innerHTML += `
            <tr>
                <td><strong>${c.nome}</strong></td>
                <td>${matriculadosAtivos}</td>
                <td>${pres}</td>
                <td>${aus}</td>
                <td>${vis}</td>
                <td>${formatarMoeda(ofe)}</td>
            </tr>
        `;
    });

    document.getElementById("geralMatriculados").textContent = tMat;
    document.getElementById("geralPresentes").textContent = tPres;
    document.getElementById("geralAusentes").textContent = tAus;
    document.getElementById("geralVisitantes").textContent = tVis;
    document.getElementById("geralOfertas").textContent = formatarMoeda(tOfe);
}
