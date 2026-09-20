/* =========================================================
   EBD MANAGER PRO - SCRIPT COMPLETO ATUALIZADO
   ========================================================= */

let supabaseClient = null;
let classes = [];
let aulas = [];
let financas = [];
let prontuarioGeral = [];

let classeAtual = null;
let alunoEditando = null;
let graficoPresencaInstancia = null;
let graficoStatusInstancia = null;

document.addEventListener("DOMContentLoaded", () => {
    const data = document.getElementById("dataDashboard");
    if (data) data.value = obterHoje();

    const dataRel = document.getElementById("dataRelatorio");
    if (dataRel) dataRel.value = obterHoje();

    const finData = document.getElementById("finData");
    if (finData) finData.value = obterHoje();

    const pData = document.getElementById("prontuarioData");
    if (pData) pData.value = obterHoje();

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
        const { data: dadosClasses, error: errC } = await supabaseClient.from('classes').select('*, alunos(*)');
        if (errC) throw errC;

        classes = (dadosClasses || []).map(c => ({
            ...c,
            alunos: (c.alunos || []).map(a => ({
                ...a,
                ehProfessor: a.eh_professor,
                dataNascimento: a.data_nascimento,
                ativo: a.ativo === true || a.ativo === null || a.ativo === undefined ? true : false,
                statusRevista: a.status_revista || 'nao_entregue',
                temaRevista: a.tema_revista || '',
                dataEntregaRevista: a.data_entrega_revista || '',
                dataPagamentoRevista: a.data_pagamento_revista || ''
            }))
        }));

        const { data: dadosAulas, error: errA } = await supabaseClient.from('aulas').select('*, presencas(*), alunos!aulas_professor_id_fkey(nome)');
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
            presencas: (a.presencas || []).map(p => ({ alunoId: p.aluno_id, status: p.status }))
        }));

        const { data: dadosFin } = await supabaseClient.from('financeiro_caixa').select('*');
        financas = dadosFin || [];

        const { data: dadosPront } = await supabaseClient.from('prontuario_lancamentos').select('*').order('data_lancamento', { ascending: false });
        prontuarioGeral = dadosPront || [];

        atualizarDashboard();
        
        if (classeAtual) {
            classeAtual = obterClasse(classeAtual.id);
            mostrarDadosClasse();
        }

        if (!document.getElementById("telaMatriculados").classList.contains("hidden")) {
            renderizarTabelaMatriculados();
        }
        if (!document.getElementById("telaFinancas").classList.contains("hidden")) {
            renderizarTelaFinancas();
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
    const telas = ["dashboard", "telaMatriculados", "telaFinancas", "dashboardMetricas", "telaClasse", "telaAula", "telaHistorico"];
    telas.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add("hidden");
    });
}

function voltarDashboard() {
    esconderTodasTelas();
    document.getElementById("dashboard").classList.remove("hidden");
    classeAtual = null;
    atualizarDashboard();
}

function atualizarDashboard() {
    mostrarEstatisticasDashboard();
    mostrarResumoDoDia();
    mostrarClasses();
    renderizarGraficosDashboard();
}

function mostrarEstatisticasDashboard() {
    let totalAlunosAtivos = 0;
    classes.forEach(c => { totalAlunosAtivos += c.alunos.filter(a => a.ativo).length; });

    const dataSel = document.getElementById("dataDashboard")?.value || obterHoje();
    const aulasDoDia = aulas.filter(a => a.data === dataSel);

    let presencas = 0, ausentes = 0, visitantes = 0, ofertas = 0;
    aulasDoDia.forEach(a => {
        a.presencas.forEach(p => { if (p.status === "presente") presencas++; else ausentes++; });
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
        const totalMatriculadosClasse = c.alunos.length;
        let presencas = 0;
        aulasC.forEach(a => a.presencas.forEach(p => { if (p.status === "presente") presencas++; }));

        container.innerHTML += `
            <div class="class-card" onclick="abrirClasse('${c.id}')" style="background:white; padding:18px; border-radius:10px; border:1px solid var(--border); cursor:pointer; box-shadow:var(--shadow); margin-bottom: 12px;">
                <div class="class-card-header">
                    <div>
                        <h3 style="color:var(--primary); font-size:1.1rem;">${c.nome}</h3>
                        <div style="font-size:0.85rem; color:var(--text-muted);">${c.dia} • ${c.horario}</div>
                    </div>
                </div>
                <div class="class-card-stats" style="display:flex; gap:15px; margin-top:12px; font-size:0.85rem; flex-wrap:wrap;">
                    <div>Total Matriculados: <strong>${totalMatriculadosClasse}</strong></div>
                    <div>Ativos: <strong>${ativos}</strong></div>
                    <div>Aulas: <strong>${aulasC.length}</strong></div>
                    <div>Presenças: <strong>${presencas}</strong></div>
                </div>
            </div>
        `;
    });
}

function renderizarGraficosDashboard() {
    const dataSel = document.getElementById("dataDashboard")?.value || obterHoje();
    const aulasDoDia = aulas.filter(a => a.data === dataSel);

    let presencasDia = 0, ausenciasDia = 0;
    aulasDoDia.forEach(a => {
        a.presencas.forEach(p => {
            if (p.status === 'presente') presencasDia++;
            else ausenciasDia++;
        });
    });

    let totalAtivos = 0, totalInativos = 0;
    classes.forEach(c => {
        c.alunos.forEach(a => {
            if (a.ativo) totalAtivos++;
            else totalInativos++;
        });
    });

    // Gráfico de Presenças do Dia
    const ctx1 = document.getElementById('graficoPresencaDia');
    if (ctx1) {
        if (graficoPresencaInstancia) graficoPresencaInstancia.destroy();
        graficoPresencaInstancia = new Chart(ctx1, {
            type: 'doughnut',
            data: {
                labels: ['Presentes', 'Ausentes'],
                datasets: [{ data: [presencasDia, ausenciasDia], backgroundColor: ['#10b981', '#ef4444'] }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Presenças vs Ausências (Data Selecionada)' } } }
        });
    }

    // Gráfico de Alunos Ativos vs Inativos
    const ctx2 = document.getElementById('graficoAlunosStatus');
    if (ctx2) {
        if (graficoStatusInstancia) graficoStatusInstancia.destroy();
        graficoStatusInstancia = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: ['Ativos', 'Inativos'],
                datasets: [{ label: 'Matriculados', data: [totalAtivos, totalInativos], backgroundColor: ['#2563eb', '#64748b'] }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Status Geral de Matriculados' } }, scales: { y: { beginAtZero: true } } }
        });
    }
}

/* =========================================================
   TELA MATRICULADOS
   ========================================================= */
function abrirTelaMatriculados() {
    esconderTodasTelas();
    document.getElementById("telaMatriculados").classList.remove("hidden");
    renderizarTabelaMatriculados();
}

function calcularFaltasConsecutivasOuTotal(alunoId) {
    const aulasOrdenadas = [...aulas].sort((a, b) => b.data.localeCompare(a.data));
    let faltas = 0;
    for (let aula of aulasOrdenadas) {
        const reg = aula.presencas.find(p => String(p.alunoId) === String(alunoId));
        if (reg) {
            if (reg.status === "ausente") faltas++;
            else break;
        }
    }
    return faltas;
}

function renderizarTabelaMatriculados() {
    const tbody = document.getElementById("tabelaMatriculados");
    if (!tbody) return;
    tbody.innerHTML = "";

    const busca = document.getElementById("buscaAlunoGeral")?.value.toLowerCase() || "";
    const statusFiltro = document.getElementById("filtroStatusAluno")?.value || "todos";

    let lista = [];
    classes.forEach(c => {
        if (c.alunos) {
            c.alunos.forEach(a => {
                const faltas = calcularFaltasConsecutivasOuTotal(a.id);
                const ativos = a.ativo === true || a.ativo === null || a.ativo === undefined;
                lista.push({ ...a, nomeClasse: c.nome, faltasRecentes: faltas, ativo: ativos });
            });
        }
    });

    let totalAtivos = lista.filter(a => a.ativo).length;
    let totalInativos = lista.filter(a => !a.ativo).length;
    let totalAtencao = lista.filter(a => a.ativo && a.faltasRecentes > 2).length;

    document.getElementById("dashMatriculadosAtivos").textContent = totalAtivos;
    document.getElementById("dashMatriculadosInativos").textContent = totalInativos;
    document.getElementById("dashMatriculadosAtencao").textContent = totalAtencao;

    lista = lista.filter(a => {
        if (!(a.nome || "").toLowerCase().includes(busca)) return false;
        if (statusFiltro === "ativos") return a.ativo === true;
        if (statusFiltro === "inativos") return a.ativo === false;
        if (statusFiltro === "faltosos") return a.ativo === true && a.faltasRecentes > 2;
        return true;
    });

    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Nenhum matriculado encontrado.</td></tr>`;
        return;
    }

    lista.forEach((aluno, index) => {
        const prontAluno = prontuarioGeral.filter(p => String(p.aluno_id) === String(aluno.id));
        const ultimaObs = prontAluno.length > 0 ? prontAluno[0].descricao : 'Nenhuma nota.';

        tbody.innerHTML += `
            <tr>
                <td><strong>${index + 1}</strong></td>
                <td><strong>${aluno.nome}</strong> ${aluno.ehProfessor ? '<small style="color:var(--primary-light)">(Prof.)</small>' : ''}</td>
                <td>${aluno.nomeClasse}</td>
                <td>${aluno.telefone || '-'}</td>
                <td>${aluno.ativo ? '<span class="badge-ativo">Ativo</span>' : '<span class="badge-inativo">Inativo</span>'} ${aluno.faltasRecentes > 2 ? '<span class="badge-alerta">⚠️ Atenção</span>' : ''}</td>
                <td><span style="font-size:0.85rem; color:var(--text-muted);">${ultimaObs}</span></td>
                <td><button class="btn btn-light" style="padding:6px 10px; font-size:0.8rem;" onclick="editarAluno('${aluno.id}')">Editar</button></td>
            </tr>
        `;
    });
}

function filtrarMatriculados() { renderizarTabelaMatriculados(); }

/* =========================================================
   PRONTUÁRIO RÁPIDO & FINANÇAS
   ========================================================= */
function abrirModalProntuarioRapido() {
    const select = document.getElementById("prontuarioAlunoId");
    select.innerHTML = `<option value="">Selecione o matriculado...</option>`;
    
    classes.forEach(c => {
        c.alunos.forEach(a => {
            select.innerHTML += `<option value="${a.id}">${a.nome} (${c.nome})</option>`;
        });
    });

    document.getElementById("prontuarioTipo").value = "revista";
    document.getElementById("prontuarioData").value = obterHoje();
    document.getElementById("prontuarioStatusRevista").value = "entregue_pago";
    document.getElementById("prontuarioValor").value = "15.00";
    document.getElementById("prontuarioTemaRevista").value = "";
    document.getElementById("prontuarioDescricao").value = "";
    verificarTipoProntuario();

    document.getElementById("modalProntuario").classList.remove("hidden");
}

function fecharModalProntuario() {
    document.getElementById("modalProntuario").classList.add("hidden");
}

function verificarTipoProntuario() {
    const tipo = document.getElementById("prontuarioTipo").value;
    const blocoRevista = document.getElementById("blocoDetalhesRevista");
    if (tipo === "revista") blocoRevista.style.display = "block";
    else blocoRevista.style.display = "none";
}

function aoSelecionarAlunoProntuario() {
    // Função auxiliar caso queira preencher dinâmico
}

async function salvarProntuarioRapido() {
    if (!supabaseClient) return;
    const alunoId = document.getElementById("prontuarioAlunoId").value;
    const tipo = document.getElementById("prontuarioTipo").value;
    const data = document.getElementById("prontuarioData").value;
    const descricao = document.getElementById("prontuarioDescricao").value.trim();

    if (!alunoId) { alert("Selecione um matriculado."); return; }

    let valorMovimento = 0;
    let descFinal = descricao;
    let nomeAlunoCache = "";

    classes.forEach(c => {
        c.alunos.forEach(a => { if (a.id === alunoId) nomeAlunoCache = a.nome; });
    });

    if (tipo === "revista") {
        const statusRev = document.getElementById("prontuarioStatusRevista").value;
        const temaRev = document.getElementById("prontuarioTemaRevista").value.trim();
        valorMovimento = Number(document.getElementById("prontuarioValor").value || 0);
        descFinal = `Revista: ${temaRev || 'Trimestral'} - Status: ${statusRev}. ${descricao}`;

        await supabaseClient.from('alunos').update({
            status_revista: statusRev,
            tema_revista: temaRev,
            data_entrega_revista: data,
            data_pagamento_revista: statusRev === 'entregue_pago' ? data : null
        }).eq('id', alunoId);

        if (valorMovimento > 0) {
            await supabaseClient.from('financeiro_caixa').insert([{
                id: gerarId(),
                tipo_movimento: 'receita',
                categoria: `${nomeAlunoCache} - Revista (${statusRev === 'entregue_pago' ? 'Paga' : 'Devendo'})`,
                descricao: `Trimestre: ${temaRev || 'Atual'}`,
                valor: valorMovimento,
                data_movimento: data
            }]);
        }
    }

    await supabaseClient.from('prontuario_lancamentos').insert([{
        id: gerarId(),
        aluno_id: alunoId,
        tipo,
        descricao: descFinal,
        valor: valorMovimento,
        data_lancamento: data
    }]);

    fecharModalProntuario();
    await carregarDadosDoBanco();
    alert("Prontuário e lançamento financeiro salvos com sucesso!");
}

function abrirDashboardFinancas() {
    esconderTodasTelas();
    document.getElementById("telaFinancas").classList.remove("hidden");
    renderizarTelaFinancas();
}

function renderizarTelaFinancas() {
    const tbody = document.getElementById("tabelaFinancas");
    if (!tbody) return;
    tbody.innerHTML = "";

    let totalEntradas = 0;
    let totalSaidas = 0;
    let totalOfertasAulas = 0;
    aulas.forEach(a => { totalOfertasAulas += Number(a.oferta || 0); });

    totalEntradas += totalOfertasAulas;

    let listaCompleta = [...financas];
    if (totalOfertasAulas > 0) {
        listaCompleta.push({
            id: 'auto-oferta',
            data_movimento: obterHoje(),
            tipo_movimento: 'receita',
            categoria: 'Oferta de Escola Dominical',
            descricao: 'Soma automática das ofertas das aulas',
            valor: totalOfertasAulas,
            automatico: true
        });
    }

    listaCompleta.sort((a, b) => b.data_movimento.localeCompare(a.data_movimento));

    listaCompleta.forEach(f => {
        if (f.tipo_movimento === 'receita') totalEntradas += Number(f.valor || 0);
        else totalSaidas += Number(f.valor || 0);

        const badgeCor = f.tipo_movimento === 'receita' ? 'badge-ativo' : 'badge-inativo';
        const botaoExcluir = f.automatico ? '-' : `<button class="btn btn-danger" style="padding:4px 8px; font-size:0.75rem;" onclick="excluirLancamentoFinanceiro('${f.id}')">Excluir</button>`;

        tbody.innerHTML += `
            <tr>
                <td>${formatarData(f.data_movimento)}</td>
                <td><span class="${badgeCor}">${f.tipo_movimento.toUpperCase()}</span></td>
                <td><strong>${f.categoria}</strong></td>
                <td>${f.descricao}</td>
                <td><strong>${formatarMoeda(f.valor)}</strong></td>
                <td>${botaoExcluir}</td>
            </tr>
        `;
    });

    const saldo = totalEntradas - totalSaidas;
    document.getElementById("finSaldoCaixa").textContent = formatarMoeda(saldo);
    document.getElementById("finTotalEntradas").textContent = formatarMoeda(totalEntradas);
    document.getElementById("finTotalSaidas").textContent = formatarMoeda(totalSaidas);
}

function abrirModalNovaDespesa() {
    const selAluno = document.getElementById("finAlunoId");
    selAluno.innerHTML = `<option value="">Nenhum / Geral</option>`;
    classes.forEach(c => {
        c.alunos.forEach(a => {
            selAluno.innerHTML += `<option value="${a.id}">${a.nome} (${c.nome})</option>`;
        });
    });

    document.getElementById("finValor").value = "";
    document.getElementById("finDescricao").value = "";
    document.getElementById("finData").value = obterHoje();
    document.getElementById("modalDespesa").classList.remove("hidden");
}

function fecharModalDespesa() {
    document.getElementById("modalDespesa").classList.add("hidden");
}

async function salvarLancamentoFinanceiro() {
    if (!supabaseClient) return;
    const tipo = document.getElementById("finTipoMov").value;
    let categoria = document.getElementById("finCategoria").value;
    const alunoId = document.getElementById("finAlunoId").value;
    const valor = Number(document.getElementById("finValor").value || 0);
    const data = document.getElementById("finData").value;
    const descricao = document.getElementById("finDescricao").value.trim();

    if (!valor || !descricao) { alert("Preencha o valor e a descrição."); return; }

    if (alunoId) {
        let nomeAluno = "";
        classes.forEach(c => { c.alunos.forEach(a => { if (a.id === alunoId) nomeAluno = a.nome; }); });
        categoria = `${nomeAluno} - Revista`;
    }

    const { error } = await supabaseClient.from('financeiro_caixa').insert([{
        id: gerarId(),
        tipo_movimento: tipo,
        categoria,
        descricao,
        valor,
        data_movimento: data
    }]);

    if (error) { alert("Erro ao salvar lançamento."); return; }

    fecharModalDespesa();
    await carregarDadosDoBanco();
}

async function excluirLancamentoFinanceiro(id) {
    if (!supabaseClient) return;
    if (!confirm("Deseja realmente excluir este lançamento financeiro?")) return;

    const { error } = await supabaseClient.from('financeiro_caixa').delete().eq('id', id);
    if (error) { alert("Erro ao excluir lançamento."); return; }

    await carregarDadosDoBanco();
}

/* =========================================================
   AULAS, CLASSE E ALUNOS
   ========================================================= */
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
    document.getElementById("tituloClasse").textContent = classeAtual.nome;
    document.getElementById("infoClasse").textContent = `${classeAtual.dia} • ${classeAtual.horario}`;
    document.getElementById("classeNomeCard").textContent = classeAtual.nome;

    const totalMatriculadosClasse = classeAtual.alunos.length;
    const ativos = classeAtual.alunos.filter(a => a.ativo).length;
    const aulasC = aulas.filter(a => String(a.classeId) === String(classeAtual.id));
    
    let presencas = 0, ausentes = 0, visitantes = 0, ofertas = 0;
    aulasC.forEach(a => {
        a.presencas.forEach(p => { if (p.status === "presente") presencas++; else ausentes++; });
        visitantes += Number(a.visitantes || 0);
        ofertas += Number(a.oferta || 0);
    });

    const totalChamadas = presencas + ausentes;
    const freq = totalChamadas > 0 ? Math.round((presencas / totalChamadas) * 100) : 0;

    document.getElementById("classeTotalAlunos").textContent = totalMatriculadosClasse;
    document.getElementById("classeTotalAulas").textContent = aulasC.length;
    document.getElementById("classeTotalPresencas").textContent = presencas;
    document.getElementById("classeTotalAusentes").textContent = ausentes;
    document.getElementById("classeTotalVisitantes").textContent = visitantes;
    document.getElementById("classeTotalOfertas").textContent = formatarMoeda(ofertas);
    document.getElementById("classeFrequencia").textContent = `${freq}%`;

    const containerAulas = document.getElementById("aulasClasse");
    containerAulas.innerHTML = "";
    if (aulasC.length === 0) {
        containerAulas.innerHTML = `<div class="empty-state">Nenhuma aula registrada nesta classe.</div>`;
    } else {
        aulasC.sort((a, b) => b.data.localeCompare(a.data)).forEach(a => {
            containerAulas.innerHTML += `
                <div style="background:white; padding:14px; border-radius:8px; border:1px solid var(--border); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong>${formatarData(a.data)} - ${a.tema || 'Sem tema'}</strong>
                        <div style="font-size:0.85rem; color:var(--text-muted);">Visitantes: ${a.visitantes} | Oferta: ${formatarMoeda(a.oferta)}</div>
                    </div>
                </div>
            `;
        });
    }
}

function voltarClasse() {
    if (classeAtual) abrirClasse(classeAtual.id);
    else voltarDashboard();
}

function abrirNovaAula() {
    if (!classeAtual) return;
    esconderTodasTelas();
    document.getElementById("telaAula").classList.remove("hidden");

    document.getElementById("tituloAula").textContent = `Nova Aula - ${classeAtual.nome}`;
    document.getElementById("dataAula").value = obterHoje();
    document.getElementById("temaAula").value = "";
    document.getElementById("visitantesAula").value = "0";
    document.getElementById("ofertaAula").value = "0.00";

    const selProf = document.getElementById("professorAula");
    selProf.innerHTML = `<option value="">Selecione o professor</option>`;
    classes.forEach(c => {
        c.alunos.filter(a => a.ehProfessor && a.ativo).forEach(p => {
            selProf.innerHTML += `<option value="${p.id}">${p.nome} (${c.nome})</option>`;
        });
    });

    const listaChamada = document.getElementById("listaChamada");
    listaChamada.innerHTML = "";

    const alunosAtivos = classeAtual.alunos.filter(a => a.ativo);
    if (alunosAtivos.length === 0) {
        listaChamada.innerHTML = `<div class="empty-state">Não há matriculados ativos nesta classe para fazer a chamada.</div>`;
        return;
    }

    alunosAtivos.forEach(aluno => {
        listaChamada.innerHTML += `
            <div class="attendance-item" data-aluno-id="${aluno.id}" style="display:flex; justify-content:space-between; align-items:center; background:white; padding:10px 14px; border-radius:8px; border:1px solid var(--border);">
                <span><strong>${aluno.nome}</strong></span>
                <div style="display:flex; gap:6px;">
                    <button type="button" class="btn btn-success btn-presenca active" onclick="marcarPresenca(this, 'presente')" style="padding:6px 12px; font-size:0.8rem;">Presente</button>
                    <button type="button" class="btn btn-light btn-presenca" onclick="marcarPresenca(this, 'ausente')" style="padding:6px 12px; font-size:0.8rem;">Ausente</button>
                </div>
            </div>
        `;
    });

    atualizarContadorPresenca();
}

function marcarPresenca(btn, status) {
    const parent = btn.parentElement;
    parent.querySelectorAll(".btn-presenca").forEach(b => {
        b.classList.remove("btn-success", "btn-danger", "active");
        b.classList.add("btn-light");
    });

    if (status === "presente") {
        btn.classList.remove("btn-light");
        btn.classList.add("btn-success", "active");
    } else {
        btn.classList.remove("btn-light");
        btn.classList.add("btn-danger", "active");
    }
    atualizarContadorPresenca();
}

function atualizarContadorPresenca() {
    const itens = document.querySelectorAll("#listaChamada .attendance-item");
    let presentes = 0;
    itens.forEach(item => {
        const btnPres = item.querySelector(".btn-success.active");
        if (btnPres) presentes++;
    });
    const contador = document.getElementById("contadorPresenca");
    if (contador) contador.textContent = `${presentes} presentes`;
}

async function salvarAula() {
    if (!supabaseClient || !classeAtual) return;

    const data = document.getElementById("dataAula").value;
    const tema = document.getElementById("temaAula").value.trim();
    const professorId = document.getElementById("professorAula").value || null;
    const visitantes = Number(document.getElementById("visitantesAula").value || 0);
    const oferta = Number(document.getElementById("ofertaAula").value || 0);

    if (!data) { alert("Informe a data da aula."); return; }

    const aulaId = gerarId();

    const { error: errAula } = await supabaseClient.from('aulas').insert([{
        id: aulaId,
        classe_id: classeAtual.id,
        data,
        tema,
        professor_id: professorId,
        visitantes,
        oferta
    }]);

    if (errAula) { alert("Erro ao salvar aula."); return; }

    const itens = document.querySelectorAll("#listaChamada .attendance-item");
    for (let item of itens) {
        const alunoId = item.getAttribute("data-aluno-id");
        const status = item.querySelector(".btn-success.active") ? "presente" : "ausente";

        await supabaseClient.from('presencas').insert([{
            id: gerarId(),
            aula_id: aulaId,
            aluno_id: alunoId,
            status
        }]);
    }

    if (oferta > 0) {
        await supabaseClient.from('financeiro_caixa').insert([{
            id: gerarId(),
            tipo_movimento: 'receita',
            categoria: 'Oferta de Escola Dominical',
            descricao: `Oferta da Aula (${classeAtual.nome} - ${formatarData(data)})`,
            valor: oferta,
            data_movimento: data
        }]);
    }

    await carregarDadosDoBanco();
    abrirClasse(classeAtual.id);
    alert("Aula salva com sucesso!");
}

function abrirHistorico() {
    if (!classeAtual) return;
    esconderTodasTelas();
    document.getElementById("telaHistorico").classList.remove("hidden");
    document.getElementById("subtituloHistorico").textContent = `Histórico de aulas da classe ${classeAtual.nome}`;

    const container = document.getElementById("listaHistorico");
    container.innerHTML = "";

    const aulasC = aulas.filter(a => String(a.classeId) === String(classeAtual.id));
    if (aulasC.length === 0) {
        container.innerHTML = `<div class="empty-state">Nenhum histórico registrado.</div>`;
        return;
    }

    aulasC.sort((a, b) => b.data.localeCompare(a.data)).forEach(a => {
        let presentes = a.presencas.filter(p => p.status === 'presente').length;
        container.innerHTML += `
            <div style="background:white; padding:16px; border-radius:8px; border:1px solid var(--border); margin-bottom:12px;">
                <h3>${formatarData(a.data)} - ${a.tema || 'Sem tema'}</h3>
                <p style="margin:6px 0; color:var(--text-muted);">Professor: ${a.professorNome || 'Não informado'} | Presentes: ${presentes} | Visitantes: ${a.visitantes} | Oferta: ${formatarMoeda(a.oferta)}</p>
            </div>
        `;
    });
}

async function excluirClasseAtual() {
    if (!supabaseClient || !classeAtual) return;
    if (!confirm(`Deseja realmente excluir a classe "${classeAtual.nome}" e todas as suas aulas?`)) return;

    const { error } = await supabaseClient.from('classes').delete().eq('id', classeAtual.id);
    if (error) { alert("Erro ao excluir classe."); return; }

    voltarDashboard();
}

function abrirDashboardMetricas() {
    esconderTodasTelas();
    document.getElementById("dashboardMetricas").classList.remove("hidden");
    calcularRelatorioPeriodo();
}
function calcularRelatorioPeriodo() {
    let totalAtivos = 0, entregues = 0;
    classes.forEach(c => {
        c.alunos.forEach(a => {
            if (a.ativo) {
                totalAtivos++;
                if (a.statusRevista !== 'nao_entregue') entregues++;
            }
        });
    });
    document.getElementById("totalRevistasNecessarias").textContent = totalAtivos;
    document.getElementById("totalRevistasEntregues").textContent = entregues;
    document.getElementById("totalRevistasPendentes").textContent = totalAtivos - entregues;
}

function abrirModalClasse() { document.getElementById("modalClasse").classList.remove("hidden"); }
function fecharModalClasse() { document.getElementById("modalClasse").classList.add("hidden"); }
async function salvarClasse() {
    if (!supabaseClient) return;
    const nome = document.getElementById("nomeClasse").value.trim();
    const dia = document.getElementById("diaClasse").value;
    const horario = document.getElementById("horarioClasse").value;
    if (!nome) return;
    await supabaseClient.from('classes').insert([{ id: gerarId(), nome, dia, horario }]);
    fecharModalClasse();
    await carregarDadosDoBanco();
}

function abrirModalAluno() {
    alunoEditando = null;
    document.getElementById("tituloModalAluno").textContent = "Novo Matriculado";
    document.getElementById("nomeAluno").value = "";
    document.getElementById("telefoneAluno").value = "";
    document.getElementById("dataNascimentoAluno").value = "";
    document.getElementById("observacoesAluno").value = "";
    const select = document.getElementById("classeAluno");
    select.innerHTML = `<option value="">Selecione a classe</option>`;
    classes.forEach(c => { select.innerHTML += `<option value="${c.id}">${c.nome}</option>`; });
    document.getElementById("modalAluno").classList.remove("hidden");
}

function abrirModalAlunoClasseAtual() {
    abrirModalAluno();
    if (classeAtual) document.getElementById("classeAluno").value = classeAtual.id;
}

function fecharModalAluno() { document.getElementById("modalAluno").classList.add("hidden"); }

async function salvarAluno() {
    if (!supabaseClient) return;
    const nome = document.getElementById("nomeAluno").value.trim();
    const telefone = document.getElementById("telefoneAluno").value.trim();
    const dataNascimento = document.getElementById("dataNascimentoAluno").value;
    const obsProntuario = document.getElementById("observacoesAluno").value.trim();
    const classeId = document.getElementById("classeAluno").value;
    const ehProfessor = document.getElementById("ehProfessor").checked;
    const ativo = document.getElementById("alunoAtivo").checked;

    if (!nome || !classeId) { alert("Preencha o nome e a classe."); return; }

    const dados = { nome, telefone, data_nascimento: dataNascimento || null, classe_id: classeId, eh_professor: ehProfessor, ativo };
    let alunoIdFinal = alunoEditando;

    if (alunoEditando) {
        await supabaseClient.from('alunos').update(dados).eq('id', alunoEditando);
    } else {
        alunoIdFinal = gerarId();
        dados.id = alunoIdFinal;
        await supabaseClient.from('alunos').insert([dados]);
    }

    if (obsProntuario) {
        await supabaseClient.from('prontuario_lancamentos').insert([{
            id: gerarId(),
            aluno_id: alunoIdFinal,
            tipo: 'anotacao',
            descricao: obsProntuario,
            valor: 0,
            data_lancamento: obterHoje()
        }]);
    }

    fecharModalAluno();
    await carregarDadosDoBanco();
}

function editarAluno(id) {
    let alunoObj = null, classeObj = null;
    classes.forEach(c => {
        const achou = c.alunos.find(a => String(a.id) === String(id));
        if (achou) { alunoObj = achou; classeObj = c; }
    });
    if (!alunoObj) return;
    alunoEditando = alunoObj.id;
    document.getElementById("tituloModalAluno").textContent = "Editar Matriculado";
    document.getElementById("nomeAluno").value = alunoObj.nome;
    document.getElementById("telefoneAluno").value = alunoObj.telefone || "";
    document.getElementById("dataNascimentoAluno").value = alunoObj.dataNascimento || "";
    
    const prontAluno = prontuarioGeral.filter(p => String(p.aluno_id) === String(id));
    document.getElementById("observacoesAluno").value = prontAluno.length > 0 ? prontAluno[0].descricao : "";

    document.getElementById("ehProfessor").checked = alunoObj.ehProfessor;
    document.getElementById("alunoAtivo").checked = alunoObj.ativo;

    const select = document.getElementById("classeAluno");
    select.innerHTML = `<option value="">Selecione a classe</option>`;
    classes.forEach(c => { select.innerHTML += `<option value="${c.id}">${c.nome}</option>`; });
    select.value = classeObj.id;

    document.getElementById("modalAluno").classList.remove("hidden");
}

function imprimirEtiquetas() {
    let janela = window.open('', '_blank');
    let html = `
        <html>
        <head><title>Etiquetas - EBD</title><style>body{font-family:Arial;margin:20px;}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:15px;}.etiqueta{border:2px dashed #333;padding:15px;border-radius:8px;}.etiqueta h3{margin:0 0 5px 0;font-size:16px;}.etiqueta p{margin:0;font-size:13px;color:#555;}</style></head>
        <body><div style="margin-bottom:20px;"><button onclick="window.print()" style="padding:10px 20px;">Imprimir</button></div><div class="grid">
    `;
    classes.forEach(c => {
        c.alunos.filter(a => a.ativo).forEach(aluno => {
            html += `<div class="etiqueta"><h3>${aluno.nome}</h3><p><strong>Classe:</strong> ${c.nome}</p><p>EBD - Escola Bíblica Dominical</p></div>`;
        });
    });
    html += `</div></body></html>`;
    janela.document.write(html);
    janela.document.close();
}

function imprimirFormularioCadastro() {
    let janela = window.open('', '_blank');
    let html = `
        <html>
        <head><title>Ficha - EBD</title><style>body{font-family:Arial;margin:40px;color:#333;}.header{text-align:center;border-bottom:2px solid #333;padding-bottom:15px;margin-bottom:25px;}.field{margin-bottom:20px;border-bottom:1px solid #ccc;padding-bottom:8px;font-size:15px;}.field strong{display:inline-block;width:180px;}.box{border:1px solid #999;height:80px;margin-top:5px;border-radius:4px;}</style></head>
        <body><div style="margin-bottom:20px;"><button onclick="window.print()" style="padding:10px 20px;">Imprimir Ficha</button></div>
        <div class="header"><h2>ESCOLA BÍBLICA DOMINICAL (EBD)</h2><p>Ficha de Cadastro de Novo Aluno / Visitante</p></div>
        <div class="field"><strong>Nome Completo:</strong> _________________________________________________</div>
        <div class="field"><strong>Telefone / WhatsApp:</strong> _____________________ <strong>Data Nasc.:</strong> ____/____/________</div>
        <div class="field"><strong>Classe Desejada:</strong> _________________________________________________</div>
        <div class="field"><strong>Deseja Revista?</strong> (  ) Sim &nbsp;&nbsp;&nbsp;&nbsp; (  ) Não</div>
        <div class="field"><strong>Observações / Visita:</strong><div class="box"></div></div></body></html>
    `;
    janela.document.write(html);
    janela.document.close();
}
