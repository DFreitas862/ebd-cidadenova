/* =========================================================
   EBD MANAGER - SISTEMA DE GESTÃO DA ESCOLA BÍBLICA (SUPABASE)
   ========================================================= */

let supabaseClient = null;
let classes = [];
let aulas = [];

let classeAtual = null;
let aulaEditando = null;
let alunoEditando = null;

/* =========================================================
   INICIALIZAÇÃO E CARREGAMENTO DE DADOS DO SUPABASE
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    const data = document.getElementById("dataDashboard");
    if (data) {
        data.value = obterHoje();
    }

    const dataRel = document.getElementById("dataRelatorio");
    if (dataRel) {
        dataRel.value = obterHoje();
    }

    if (window.supabase && typeof SUPABASE_URL !== 'undefined') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        carregarDadosDoBanco();
    } else {
        console.error("Supabase SDK ou config.js não foram carregados corretamente.");
    }
});

async function carregarDadosDoBanco() {
    if (!supabaseClient) return;

    try {
        const { data: dadosClasses, error: erroClasses } = await supabaseClient
            .from('classes')
            .select('*, alunos(*)');

        if (erroClasses) throw erroClasses;

        classes = (dadosClasses || []).map(c => ({
            ...c,
            alunos: (c.alunos || []).map(a => ({
                ...a,
                ehProfessor: a.eh_professor,
                dataNascimento: a.data_nascimento
            }))
        }));

        const { data: dadosAulas, error: erroAulas } = await supabaseClient
            .from('aulas')
            .select('*, presencas(*), alunos!aulas_professor_id_fkey(nome)');

        if (erroAulas) throw erroAulas;

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

        atualizarDashboard();
        if (classeAtual) {
            mostrarDadosClasse();
        }
    } catch (error) {
        console.error("Erro ao carregar dados do Supabase:", error);
    }
}

/* =========================================================
   UTILITÁRIOS
   ========================================================= */

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
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function formatarData(data) {
    if (!data) return "-";
    const partes = data.split("-");
    if (partes.length !== 3) return data;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function obterClasse(id) {
    return classes.find(classe => String(classe.id) === String(id));
}

function esconderTodasTelas() {
    const telas = [
        "dashboard",
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

/* =========================================================
   DASHBOARD
   ========================================================= */

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

/* =========================================================
   ESTATÍSTICAS GERAIS
   ========================================================= */

function mostrarEstatisticasDashboard() {
    let totalAlunos = 0;

    classes.forEach(classe => {
        totalAlunos += classe.alunos.length;
    });

    const dataSelecionada = document.getElementById("dataDashboard")?.value || obterHoje();
    const aulasDoDia = aulas.filter(aula => aula.data === dataSelecionada);

    let presencas = 0;
    let ausentes = 0;
    let visitantes = 0;
    let ofertas = 0;

    aulasDoDia.forEach(aula => {
        aula.presencas.forEach(registro => {
            if (registro.status === "presente") {
                presencas++;
            } else {
                ausentes++;
            }
        });

        visitantes += Number(aula.visitantes || 0);
        ofertas += Number(aula.oferta || 0);
    });

    document.getElementById("totalClasses").textContent = classes.length;
    document.getElementById("totalAlunos").textContent = totalAlunos;
    document.getElementById("totalPresencas").textContent = presencas;
    document.getElementById("totalAusentes").textContent = ausentes;
    document.getElementById("totalVisitantes").textContent = visitantes;
    document.getElementById("totalOfertas").textContent = formatarMoeda(ofertas);
}

/* =========================================================
   RESUMO DO DIA
   ========================================================= */

function mostrarResumoDoDia() {
    const container = document.getElementById("resumoDoDia");
    if (!container) return;

    const dataSelecionada = document.getElementById("dataDashboard")?.value || obterHoje();
    const aulasDoDia = aulas.filter(aula => aula.data === dataSelecionada);

    if (aulasDoDia.length === 0) {
        container.innerHTML = `
            <div class="daily-summary-card">
                <span>Aulas</span>
                <strong>0</strong>
            </div>
            <div class="daily-summary-card">
                <span>Presenças</span>
                <strong>0</strong>
            </div>
            <div class="daily-summary-card">
                <span>Visitantes</span>
                <strong>0</strong>
            </div>
            <div class="daily-summary-card">
                <span>Ofertas</span>
                <strong>R$ 0,00</strong>
            </div>
        `;
        return;
    }

    let presencas = 0;
    let visitantes = 0;
    let ofertas = 0;

    aulasDoDia.forEach(aula => {
        aula.presencas.forEach(registro => {
            if (registro.status === "presente") {
                presencas++;
            }
        });

        visitantes += Number(aula.visitantes || 0);
        ofertas += Number(aula.oferta || 0);
    });

    container.innerHTML = `
        <div class="daily-summary-card">
            <span>Aulas</span>
            <strong>${aulasDoDia.length}</strong>
        </div>
        <div class="daily-summary-card">
            <span>Presenças</span>
            <strong>${presencas}</strong>
        </div>
        <div class="daily-summary-card">
            <span>Visitantes</span>
            <strong>${visitantes}</strong>
        </div>
        <div class="daily-summary-card">
            <span>Ofertas</span>
            <strong>${formatarMoeda(ofertas)}</strong>
        </div>
    `;
}

/* =========================================================
   MOSTRAR CLASSES
   ========================================================= */

function mostrarClasses() {
    const container = document.getElementById("listaClasses");
    if (!container) return;

    container.innerHTML = "";

    if (classes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <strong>Nenhuma classe cadastrada.</strong><br><br>
                Cadastre sua primeira classe para começar.
            </div>
        `;
        return;
    }

    classes.forEach(classe => {
        const aulasClasse = aulas.filter(aula => String(aula.classeId) === String(classe.id));
        let presencas = 0;

        aulasClasse.forEach(aula => {
            aula.presencas.forEach(registro => {
                if (registro.status === "presente") {
                    presencas++;
                }
            });
        });

        container.innerHTML += `
            <div class="class-card" onclick="abrirClasse('${classe.id}')">
                <div class="class-card-header">
                    <div>
                        <h3>${classe.nome}</h3>
                        <div class="class-card-info">
                            ${classe.dia} • ${classe.horario}
                        </div>
                    </div>
                </div>

                <div class="class-card-stats">
                    <div class="class-mini-stat">
                        <span>Alunos</span>
                        <strong>${classe.alunos.length}</strong>
                    </div>

                    <div class="class-mini-stat">
                        <span>Aulas</span>
                        <strong>${aulasClasse.length}</strong>
                    </div>

                    <div class="class-mini-stat">
                        <span>Presenças</span>
                        <strong>${presencas}</strong>
                    </div>
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

function fecharModalClasse() {
    document.getElementById("modalClasse").classList.add("hidden");
}

async function salvarClasse() {
    if (!supabaseClient) return;

    const nome = document.getElementById("nomeClasse").value.trim();
    const dia = document.getElementById("diaClasse").value;
    const horario = document.getElementById("horarioClasse").value;

    if (!nome) {
        alert("Digite o nome da classe.");
        return;
    }

    if (!horario) {
        alert("Informe o horário.");
        return;
    }

    const novaClasse = {
        id: gerarId(),
        nome,
        dia,
        horario
    };

    const { error } = await supabaseClient.from('classes').insert([novaClasse]);
    if (error) {
        console.error("Erro ao salvar classe:", error);
        alert("Erro ao salvar classe no banco.");
        return;
    }

    fecharModalClasse();
    await carregarDadosDoBanco();
    alert("Classe cadastrada com sucesso!");
}

async function excluirClasseAtual() {
    if (!supabaseClient || !classeAtual) return;

    const confirmacao = confirm(
        `Deseja realmente excluir a classe "${classeAtual.nome}"?\n\n` +
        `ATENÇÃO: Todos os alunos, aulas e registros de presença vinculados a esta classe também serão excluídos permanentemente!`
    );

    if (!confirmacao) return;

    const { error } = await supabaseClient.from('classes').delete().eq('id', classeAtual.id);
    if (error) {
        console.error("Erro ao excluir classe:", error);
        alert("Erro ao excluir classe.");
        return;
    }

    alert("Classe excluída com sucesso!");
    voltarDashboard();
    await carregarDadosDoBanco();
}

/* =========================================================
   ABRIR CLASSE
   ========================================================= */

function abrirClasse(id) {
    const classe = obterClasse(id);

    if (!classe) {
        alert("Classe não encontrada.");
        return;
    }

    classeAtual = classe;

    esconderTodasTelas();
    document.getElementById("telaClasse").classList.remove("hidden");

    mostrarDadosClasse();
}

function mostrarDadosClasse() {
    if (!classeAtual) return;

    classeAtual = obterClasse(classeAtual.id);

    if (!classeAtual) {
        alert("Classe não encontrada.");
        voltarDashboard();
        return;
    }

    const aulasClasse = aulas.filter(aula => String(aula.classeId) === String(classeAtual.id));

    document.getElementById("tituloClasse").textContent = classeAtual.nome;
    document.getElementById("infoClasse").textContent = `${classeAtual.dia} • ${classeAtual.horario}`;
    document.getElementById("classeNomeCard").textContent = classeAtual.nome;

    let presencas = 0;
    let ausentes = 0;
    let visitantes = 0;
    let ofertas = 0;

    aulasClasse.forEach(aula => {
        aula.presencas.forEach(registro => {
            if (registro.status === "presente") {
                presencas++;
            } else {
                ausentes++;
            }
        });

        visitantes += Number(aula.visitantes || 0);
        ofertas += Number(aula.oferta || 0);
    });

    const totalPossivel = classeAtual.alunos.length * aulasClasse.length;
    const frequencia = totalPossivel > 0 ? (presencas / totalPossivel) * 100 : 0;

    document.getElementById("classeTotalAlunos").textContent = classeAtual.alunos.length;
    document.getElementById("classeTotalAulas").textContent = aulasClasse.length;
    document.getElementById("classeTotalPresencas").textContent = presencas;
    document.getElementById("classeTotalAusentes").textContent = ausentes;
    document.getElementById("classeTotalVisitantes").textContent = visitantes;
    document.getElementById("classeTotalOfertas").textContent = formatarMoeda(ofertas);
    document.getElementById("classeFrequencia").textContent = `${frequencia.toFixed(1)}%`;

    document.getElementById("resumoNomeClasse").textContent = classeAtual.nome;
    document.getElementById("resumoInfoClasse").textContent = `${classeAtual.dia} • ${classeAtual.horario}`;
    document.getElementById("resumoAulas").textContent = aulasClasse.length;
    document.getElementById("resumoPresencas").textContent = presencas;
    document.getElementById("resumoVisitantes").textContent = visitantes;
    document.getElementById("resumoOfertas").textContent = formatarMoeda(ofertas);

    mostrarRanking();
    mostrarAlunosClasse();
    mostrarAulasClasse();
}

/* =========================================================
   RANKING
   ========================================================= */

function mostrarRanking() {
    const container = document.getElementById("rankingAlunos");
    if (!container) return;

    container.innerHTML = "";

    if (!classeAtual || classeAtual.alunos.length === 0) {
        container.innerHTML = `<div class="empty-state">Nenhum aluno cadastrado.</div>`;
        return;
    }

    const aulasClasse = aulas.filter(aula => String(aula.classeId) === String(classeAtual.id));

    const ranking = classeAtual.alunos.map(aluno => {
        let presentes = 0;
        let ausentes = 0;

        aulasClasse.forEach(aula => {
            const registro = aula.presencas.find(item => String(item.alunoId) === String(aluno.id));
            if (!registro) return;

            if (registro.status === "presente") {
                presentes++;
            } else {
                ausentes++;
            }
        });

        const total = presentes + ausentes;
        const frequencia = total > 0 ? (presentes / total) * 100 : 0;

        return {
            aluno,
            presentes,
            ausentes,
            frequencia
        };
    });

    ranking.sort((a, b) => b.frequencia - a.frequencia);

    ranking.forEach((item, index) => {
        container.innerHTML += `
            <div class="ranking-item">
                <div class="ranking-position">${index + 1}</div>
                <div class="ranking-name">
                    <strong>${item.aluno.nome}</strong>
                    <span>${item.aluno.ehProfessor ? "Professor" : "Aluno"}</span>
                </div>
                <div class="ranking-number">
                    <span>Presenças</span>
                    <strong>${item.presentes}</strong>
                </div>
                <div>
                    <div class="frequency-bar">
                        <div style="width: ${item.frequencia}%"></div>
                    </div>
                    <div class="ranking-number" style="margin-top:5px">
                        <strong>${item.frequencia.toFixed(1)}%</strong>
                    </div>
                </div>
            </div>
        `;
    });
}

/* =========================================================
   ALUNOS DA CLASSE
   ========================================================= */

function mostrarAlunosClasse() {
    const container = document.getElementById("alunosClasse");
    if (!container) return;

    container.innerHTML = "";

    if (!classeAtual || classeAtual.alunos.length === 0) {
        container.innerHTML = `<div class="empty-state">Nenhum aluno cadastrado nesta classe.</div>`;
        return;
    }

    classeAtual.alunos.forEach(aluno => {
        const iniciais = aluno.nome
            .split(" ")
            .slice(0, 2)
            .map(nome => nome.charAt(0).toUpperCase())
            .join("");

        container.innerHTML += `
            <div class="student-item">
                <div class="student-info">
                    <div class="student-avatar">${iniciais}</div>
                    <div>
                        <strong>${aluno.nome}</strong>
                        <span>
                            ${aluno.ehProfessor ? "Professor" : "Aluno"}
                            ${aluno.telefone ? " • " + aluno.telefone : ""}
                        </span>
                    </div>
                </div>
                <div class="student-actions">
                    <button class="icon-button" onclick="editarAluno('${aluno.id}')" title="Editar aluno">✎</button>
                </div>
            </div>
        `;
    });
}

/* =========================================================
   AULAS DA CLASSE
   ========================================================= */

function mostrarAulasClasse() {
    const container = document.getElementById("aulasClasse");
    if (!container) return;

    container.innerHTML = "";

    if (!classeAtual) return;

    const aulasClasse = aulas
        .filter(aula => String(aula.classeId) === String(classeAtual.id))
        .sort((a, b) => b.data.localeCompare(a.data))
        .slice(0, 8);

    if (aulasClasse.length === 0) {
        container.innerHTML = `<div class="empty-state">Nenhuma aula registrada.</div>`;
        return;
    }

    aulasClasse.forEach(aula => adicionarCardAula(aula, container));
}

function adicionarCardAula(aula, container) {
    let presencas = 0;

    aula.presencas.forEach(registro => {
        if (registro.status === "presente") presencas++;
    });

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
                <div class="lesson-stat">
                    <span>Presenças</span>
                    <strong>${presencas}</strong>
                </div>
                <div class="lesson-stat">
                    <span>Visitantes</span>
                    <strong>${aula.visitantes || 0}</strong>
                </div>
                <div class="lesson-stat">
                    <span>Oferta</span>
                    <strong>${formatarMoeda(aula.oferta)}</strong>
                </div>
            </div>

            <div class="lesson-actions">
                <button class="icon-button" title="Editar aula" onclick="editarAula('${aula.id}')">✎</button>
                <button class="delete-button" title="Excluir aula" onclick="event.stopPropagation(); excluirAula('${aula.id}')">×</button>
            </div>
        </div>
    `;
}

/* =========================================================
   MODAL ALUNO
   ========================================================= */

function abrirModalAluno() {
    alunoEditando = null;

    document.getElementById("tituloModalAluno").textContent = "Novo Aluno";
    document.getElementById("nomeAluno").value = "";
    document.getElementById("telefoneAluno").value = "";
    document.getElementById("dataNascimentoAluno").value = "";
    document.getElementById("ehProfessor").checked = false;

    carregarSelectClasses();
    document.getElementById("classeAluno").value = "";

    document.getElementById("modalAluno").classList.remove("hidden");
}

function abrirModalAlunoClasseAtual() {
    abrirModalAluno();
    if (classeAtual) {
        document.getElementById("classeAluno").value = classeAtual.id;
    }
}

function fecharModalAluno() {
    document.getElementById("modalAluno").classList.add("hidden");
    alunoEditando = null;
}

function carregarSelectClasses() {
    const select = document.getElementById("classeAluno");
    select.innerHTML = `<option value="">Selecione a classe</option>`;

    classes.forEach(classe => {
        select.innerHTML += `<option value="${classe.id}">${classe.nome}</option>`;
    });
}

async function salvarAluno() {
    if (!supabaseClient) return;

    const nome = document.getElementById("nomeAluno").value.trim();
    const telefone = document.getElementById("telefoneAluno").value.trim();
    const dataNascimento = document.getElementById("dataNascimentoAluno").value;
    const classeId = document.getElementById("classeAluno").value;
    const ehProfessor = document.getElementById("ehProfessor").checked;

    if (!nome) {
        alert("Digite o nome do aluno.");
        return;
    }

    if (!classeId) {
        alert("Selecione uma classe.");
        return;
    }

    if (alunoEditando) {
        const { error } = await supabaseClient.from('alunos').update({
            nome,
            telefone,
            data_nascimento: dataNascimento ? dataNascimento : null,
            classe_id: classeId,
            eh_professor: ehProfessor
        }).eq('id', alunoEditando);

        if (error) {
            console.error("Erro ao atualizar aluno:", error);
            alert("Erro ao atualizar aluno.");
            return;
        }

        fecharModalAluno();
        await carregarDadosDoBanco();
        if (classeAtual) {
            classeAtual = obterClasse(classeAtual.id);
            mostrarDadosClasse();
        }
        alert("Aluno atualizado com sucesso!");
        return;
    }

    const novoAluno = {
        id: gerarId(),
        classe_id: classeId,
        nome,
        telefone,
        data_nascimento: dataNascimento ? dataNascimento : null,
        eh_professor: ehProfessor
    };

    const { error } = await supabaseClient.from('alunos').insert([novoAluno]);
    if (error) {
        console.error("Erro ao salvar aluno:", error);
        alert("Erro ao salvar aluno.");
        return;
    }

    fecharModalAluno();
    await carregarDadosDoBanco();
    atualizarDashboard();

    alert("Aluno cadastrado com sucesso!");

    if (classeAtual) {
        classeAtual = obterClasse(classeAtual.id);
        mostrarDadosClasse();
    }
}

function editarAluno(id) {
    let aluno = null;
    let classeDoAluno = null;

    classes.forEach(classe => {
        const encontrado = classe.alunos.find(item => String(item.id) === String(id));
        if (encontrado) {
            aluno = encontrado;
            classeDoAluno = classe;
        }
    });

    if (!aluno) {
        alert("Aluno não encontrado.");
        return;
    }

    alunoEditando = aluno.id;

    document.getElementById("tituloModalAluno").textContent = "Editar Aluno";
    document.getElementById("nomeAluno").value = aluno.nome || "";
    document.getElementById("telefoneAluno").value = aluno.telefone || "";
    document.getElementById("dataNascimentoAluno").value = aluno.dataNascimento || "";
    document.getElementById("ehProfessor").checked = aluno.ehProfessor === true;

    carregarSelectClasses();
    document.getElementById("classeAluno").value = classeDoAluno.id;

    document.getElementById("modalAluno").classList.remove("hidden");
}

/* =========================================================
   NOVA AULA (COM PROFESSORES GLOBAIS DA EBD)
   ========================================================= */

function abrirNovaAula() {
    if (!classeAtual) {
        alert("Selecione uma classe.");
        return;
    }

    // Coleta TODOS os professores cadastrados em QUALQUER classe da EBD
    let todosProfessores = [];
    classes.forEach(c => {
        const profsDaClasse = c.alunos.filter(a => a.ehProfessor === true);
        todosProfessores = todosProfessores.concat(profsDaClasse);
    });

    if (todosProfessores.length === 0) {
        alert(
            "A EBD ainda não possui nenhum aluno marcado como professor em nenhuma classe.\n\n" +
            "Abra o cadastro de um aluno e marque a opção \"Este aluno também é professor\"."
        );
        return;
    }

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

function carregarProfessoresGlobais(professorSelecionado = "") {
    const select = document.getElementById("professorAula");
    select.innerHTML = `<option value="">Selecione o professor</option>`;

    let todosProfessores = [];
    classes.forEach(c => {
        const profsDaClasse = c.alunos.filter(a => a.ehProfessor === true);
        todosProfessores = todosProfessores.concat(profsDaClasse);
    });

    todosProfessores.forEach(professor => {
        select.innerHTML += `<option value="${professor.id}">${professor.nome}</option>`;
    });

    if (professorSelecionado) {
        select.value = professorSelecionado;
    }
}

/* =========================================================
   CHAMADA
   ========================================================= */

function mostrarChamada(registrosExistentes = []) {
    const container = document.getElementById("listaChamada");
    container.innerHTML = "";

    if (!classeAtual) return;

    classeAtual.alunos.forEach(aluno => {
        const registro = registrosExistentes.find(item => String(item.alunoId) === String(aluno.id));
        const status = registro ? registro.status : "ausente";

        container.innerHTML += `
            <div class="attendance-item">
                <div class="attendance-student">
                    <div class="student-avatar">${aluno.nome.charAt(0).toUpperCase()}</div>
                    <strong>${aluno.nome}</strong>
                </div>

                <div class="attendance-buttons">
                    <button id="presente-${aluno.id}" class="attendance-btn ${status === 'presente' ? 'present' : ''}" onclick="marcarPresenca('${aluno.id}', 'presente')">
                        ✓ Presente
                    </button>
                    <button id="ausente-${aluno.id}" class="attendance-btn ${status === 'absent' ? 'absent' : ''}" onclick="marcarPresenca('${aluno.id}', 'ausente')">
                        × Ausente
                    </button>
                </div>
            </div>
        `;
    });

    atualizarContadorPresenca();
}

function marcarPresenca(alunoId, status) {
    const presente = document.getElementById(`presente-${alunoId}`);
    const ausente = document.getElementById(`ausente-${alunoId}`);

    if (!presente || !ausente) return;

    presente.classList.remove("present");
    ausente.classList.remove("absent");

    if (status === "presente") {
        presente.classList.add("present");
    } else {
        ausente.classList.add("absent");
    }

    atualizarContadorPresenca();
}

function atualizarContadorPresenca() {
    if (!classeAtual) return;

    let presentes = 0;

    classeAtual.alunos.forEach(aluno => {
        const botao = document.getElementById(`presente-${aluno.id}`);
        if (botao && botao.classList.contains("present")) {
            presentes++;
        }
    });

    const contador = document.getElementById("contadorPresenca");
    if (contador) {
        contador.textContent = `${presentes} ${presentes === 1 ? "presente" : "presentes"}`;
    }
}

/* =========================================================
   SALVAR AULA
   ========================================================= */

async function salvarAula() {
    if (!supabaseClient || !classeAtual) return;

    const data = document.getElementById("dataAula").value;
    const tema = document.getElementById("temaAula").value.trim();
    const professorId = document.getElementById("professorAula").value;
    const visitantes = Number(document.getElementById("visitantesAula").value || 0);
    const oferta = Number(document.getElementById("ofertaAula").value || 0);

    if (!data) {
        alert("Informe a data da aula.");
        return;
    }

    if (!tema) {
        alert("Informe o tema da aula.");
        return;
    }

    if (!professorId) {
        alert("Selecione o professor.");
        return;
    }

    const presencasColetadas = classeAtual.alunos.map(aluno => {
        const presente = document.getElementById(`presente-${aluno.id}`)?.classList.contains("present");
        return {
            id: gerarId(),
            aluno_id: aluno.id,
            status: presente ? "presente" : "ausente"
        };
    });

    if (aulaEditando) {
        const { error: errAula } = await supabaseClient.from('aulas').update({
            data,
            tema,
            professor_id: professorId,
            visitantes,
            oferta
        }).eq('id', aulaEditando);

        if (errAula) {
            console.error("Erro ao atualizar aula:", errAula);
            alert("Erro ao atualizar aula.");
            return;
        }

        await supabaseClient.from('presencas').delete().eq('aula_id', aulaEditando);

        const presencasParaSalvar = presencasColetadas.map(p => ({
            id: p.id,
            aula_id: aulaEditando,
            aluno_id: p.aluno_id,
            status: p.status
        }));

        await supabaseClient.from('presencas').insert(presencasParaSalvar);

        aulaEditando = null;
        await carregarDadosDoBanco();
        voltarClasse();
        alert("Aula atualizada com sucesso!");
        return;
    }

    const novaAulaId = gerarId();
    const novaAula = {
        id: novaAulaId,
        classe_id: classeAtual.id,
        data,
        tema,
        professor_id: professorId,
        visitantes,
        oferta
    };

    const { error: errAula } = await supabaseClient.from('aulas').insert([novaAula]);
    if (errAula) {
        console.error("Erro ao salvar aula:", errAula);
        alert("Erro ao salvar aula.");
        return;
    }

    const presencasParaSalvar = presencasColetadas.map(p => ({
        id: p.id,
        aula_id: novaAulaId,
        aluno_id: p.aluno_id,
        status: p.status
    }));

    await supabaseClient.from('presencas').insert(presencasParaSalvar);

    await carregarDadosDoBanco();
    voltarClasse();
    alert("Aula registrada com sucesso!");
}

/* =========================================================
   EDITAR E EXCLUIR AULA
   ========================================================= */

function editarAula(id) {
    const aula = aulas.find(item => String(item.id) === String(id));

    if (!aula) {
        alert("Aula não encontrada.");
        return;
    }

    const classe = obterClasse(aula.classeId);
    if (!classe) {
        alert("Classe da aula não encontrada.");
        return;
    }

    classeAtual = classe;
    aulaEditando = aula.id;

    esconderTodasTelas();
    document.getElementById("telaAula").classList.remove("hidden");

    document.getElementById("tituloAula").textContent = "Editar Aula";
    document.getElementById("subtituloAula").textContent = classe.nome;
    document.getElementById("dataAula").value = aula.data;
    document.getElementById("temaAula").value = aula.tema || "";
    document.getElementById("visitantesAula").value = aula.visitantes || 0;
    document.getElementById("ofertaAula").value = aula.oferta || 0;

    carregarProfessoresGlobais(aula.professorId);
    mostrarChamada(aula.presencas || []);
}

async function excluirAula(aulaId) {
    if (!supabaseClient) return;

    const aula = aulas.find(item => String(item.id) === String(aulaId));

    if (!aula) {
        alert("Aula não encontrada.");
        return;
    }

    const confirmacao = confirm(
        `Deseja realmente excluir esta aula?\n\n` +
        `Data: ${formatarData(aula.data)}\n` +
        `Tema: ${aula.tema}\n\n` +
        `Essa ação não poderá ser desfeita.`
    );

    if (!confirmacao) return;

    const { error } = await supabaseClient.from('aulas').delete().eq('id', aulaId);
    if (error) {
        console.error("Erro ao excluir aula:", error);
        alert("Erro ao excluir aula.");
        return;
    }

    await carregarDadosDoBanco();

    if (classeAtual) {
        classeAtual = obterClasse(classeAtual.id);
        mostrarDadosClasse();
    }

    atualizarDashboard();
    alert("Aula excluída com sucesso!");
}

function voltarClasse() {
    if (!classeAtual) {
        voltarDashboard();
        return;
    }

    esconderTodasTelas();
    document.getElementById("telaClasse").classList.remove("hidden");

    aulaEditando = null;
    mostrarDadosClasse();
}

/* =========================================================
   HISTÓRICO
   ========================================================= */

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

    if (!classeAtual) return;

    const aulasClasse = aulas
        .filter(aula => String(aula.classeId) === String(classeAtual.id))
        .sort((a, b) => b.data.localeCompare(a.data));

    if (aulasClasse.length === 0) {
        container.innerHTML = `<div class="panel"><div class="empty-state">Nenhuma aula registrada.</div></div>`;
        return;
    }

    aulasClasse.forEach(aula => {
        const presencas = aula.presencas.filter(registro => registro.status === "presente").length;
        const ausentes = aula.presencas.filter(registro => registro.status === "ausente").length;

        container.innerHTML += `
            <div class="history-item">
                <div class="history-info">
                    <strong>${aula.tema}</strong>
                    <span>${formatarData(aula.data)} • Professor: ${aula.professorNome}</span>
                </div>

                <div class="history-stats">
                    <div class="history-stat">
                        <span>Presentes</span>
                        <strong>${presencas}</strong>
                    </div>
                    <div class="history-stat">
                        <span>Ausentes</span>
                        <strong>${ausentes}</strong>
                    </div>
                    <div class="history-stat">
                        <span>Visitantes</span>
                        <strong>${aula.visitantes || 0}</strong>
                    </div>
                    <div class="history-stat">
                        <span>Oferta</span>
                        <strong>${formatarMoeda(aula.oferta)}</strong>
                    </div>

                    <button class="icon-button" title="Editar" onclick="editarAula('${aula.id}')">✎</button>
                    <button class="delete-button" title="Excluir" onclick="excluirAula('${aula.id}')">×</button>
                </div>
            </div>
        `;
    });
}

/* =========================================================
   DASHBOARD DE MÉTRICAS E RELATÓRIOS
   ========================================================= */

function abrirDashboardMetricas() {
    esconderTodasTelas();
    document.getElementById("dashboardMetricas").classList.remove("hidden");
    mudarFiltroPeriodo();
    calcularMetricasMensais();
}

function mudarFiltroPeriodo() {
    const periodo = document.getElementById("filtroPeriodo").value;
    const grupoData = document.getElementById("grupoDataEspecifica");

    if (periodo === "dia") {
        grupoData.style.display = "block";
    } else {
        grupoData.style.display = "none";
    }

    calcularRelatorioPeriodo();
}

function calcularRelatorioPeriodo() {
    const periodo = document.getElementById("filtroPeriodo").value;
    const dataRefStr = document.getElementById("dataRelatorio").value || obterHoje();
    const dataRef = new Date(dataRefStr + "T00:00:00");

    let aulasFiltradas = aulas.filter(aula => {
        if (!aula.data) return false;
        const dataAula = new Date(aula.data + "T00:00:00");

        if (periodo === "dia") {
            return aula.data === dataRefStr;
        } else if (periodo === "semana") {
            // Início e fim da semana (domingo a sábado)
            const primeiroDia = new Date(dataRef);
            primeiroDia.setDate(dataRef.getDate() - dataRef.getDay());
            const ultimoDia = new Date(primeiroDia);
            ultimoDia.setDate(primeiroDia.getDate() + 6);
            return dataAula >= primeiroDia && dataAula <= ultimoDia;
        } else if (periodo === "mes") {
            return dataAula.getFullYear() === dataRef.getFullYear() && dataAula.getMonth() === dataRef.getMonth();
        } else if (periodo === "trimestre") {
            const mesAtual = dataAula.getMonth();
            const trimestreAtual = Math.floor(mesAtual / 3);
            const trimestreAula = Math.floor(dataAula.getMonth() / 3);
            return dataAula.getFullYear() === dataRef.getFullYear() && trimestreAula === trimestreAtual;
        }
        return false;
    });

    const tbody = document.getElementById("tabelaRelatorioClasses");
    tbody.innerHTML = "";

    let totalMat = 0;
    let totalPres = 0;
    let totalAus = 0;
    let totalVis = 0;
    let totalOfe = 0;

    if (classes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Nenhuma classe cadastrada.</td></tr>`;
    } else {
        classes.forEach(classe => {
            const aulasDaClasse = aulasFiltradas.filter(a => String(a.classeId) === String(classe.id));
            const matriculados = classe.alunos.length;
            
            let presencas = 0;
            let ausentes = 0;
            let visitantes = 0;
            let oferta = 0;

            aulasDaClasse.forEach(aula => {
                visitantes += Number(aula.visitantes || 0);
                oferta += Number(aula.oferta || 0);
                
                aula.presencas.forEach(p => {
                    if (p.status === "presente") presencas++;
                    else ausentes++;
                });
            });

            totalMat += matriculados;
            totalPres += presencas;
            totalAus += ausentes;
            totalVis += visitantes;
            totalOfe += oferta;

            tbody.innerHTML += `
                <tr>
                    <td><strong>${classe.nome}</strong></td>
                    <td>${matriculados}</td>
                    <td>${presencas}</td>
                    <td>${ausentes}</td>
                    <td>${visitantes}</td>
                    <td>${formatarMoeda(oferta)}</td>
                </tr>
            `;
        });
    }

    document.getElementById("geralMatriculados").textContent = totalMat;
    document.getElementById("geralPresentes").textContent = totalPres;
    document.getElementById("geralAusentes").textContent = totalAus;
    document.getElementById("geralVisitantes").textContent = totalVis;
    document.getElementById("geralOfertas").textContent = formatarMoeda(totalOfe);
}

function obterPeriodoMeses(deslocamento = 0) {
    const hoje = new Date();
    const data = new Date(hoje.getFullYear(), hoje.getMonth() + deslocamento, 1);
    return {
        ano: data.getFullYear(),
        mes: data.getMonth()
    };
}

function calcularMetricasMensais() {
    const atual = obterPeriodoMeses(0);
    const anterior = obterPeriodoMeses(-1);

    const dadosAtual = calcularPeriodo(atual.ano, atual.mes);
    const dadosAnterior = calcularPeriodo(anterior.ano, anterior.mes);

    document.getElementById("metricaClasses").textContent = dadosAtual.classes;
    document.getElementById("metricaAlunos").textContent = dadosAtual.alunos;
    document.getElementById("metricaProfessores").textContent = dadosAtual.professores;
    document.getElementById("metricaAulas").textContent = dadosAtual.aulas;
    document.getElementById("metricaPresencas").textContent = dadosAtual.presencas;
    document.getElementById("metricaFrequencia").textContent = `${dadosAtual.frequencia.toFixed(1)}%`;
    document.getElementById("metricaVisitantes").textContent = dadosAtual.visitantes;
    document.getElementById("metricaOfertas").textContent = formatarMoeda(dadosAtual.ofertas);

    mostrarTendencia("trendClasses", dadosAtual.classes, dadosAnterior.classes);
    mostrarTendencia("trendAlunos", dadosAtual.alunos, dadosAnterior.alunos);
    mostrarTendencia("trendProfessores", dadosAtual.professores, dadosAnterior.professores);
    mostrarTendencia("trendAulas", dadosAtual.aulas, dadosAnterior.aulas);
    mostrarTendencia("trendPresencas", dadosAtual.presencas, dadosAnterior.presencas);
    mostrarTendencia("trendFrequencia", dadosAtual.frequencia, dadosAnterior.frequencia);
    mostrarTendencia("trendVisitantes", dadosAtual.visitantes, dadosAnterior.visitantes);
    mostrarTendencia("trendOfertas", dadosAtual.ofertas, dadosAnterior.ofertas);

    mostrarComparacao(dadosAtual, dadosAnterior);
}

function calcularPeriodo(ano, mes) {
    const aulasPeriodo = aulas.filter(aula => {
        if (!aula.data) return false;
        const partes = aula.data.split("-");
        const anoAula = Number(partes[0]);
        const mesAula = Number(partes[1]) - 1;
        return anoAula === ano && mesAula === mes;
    });

    let presencas = 0;
    let ausentes = 0;
    let visitantes = 0;
    let ofertas = 0;

    aulasPeriodo.forEach(aula => {
        aula.presencas.forEach(registro => {
            if (registro.status === "presente") {
                presencas++;
            } else {
                ausentes++;
            }
        });

        visitantes += Number(aula.visitantes || 0);
        ofertas += Number(aula.oferta || 0);
    });

    const totalPossivel = classes.reduce((total, classe) => {
        const aulasDaClasse = aulasPeriodo.filter(aula => String(aula.classeId) === String(classe.id)).length;
        return total + (classe.alunos.length * aulasDaClasse);
    }, 0);

    const frequencia = totalPossivel > 0 ? (presencas / totalPossivel) * 100 : 0;
    const alunos = classes.reduce((total, classe) => total + classe.alunos.length, 0);
    
    let professoresCount = 0;
    classes.forEach(c => {
        c.alunos.forEach(a => {
            if (a.ehProfessor === true) professoresCount++;
        });
    });

    return {
        classes: classes.length,
        alunos,
        professores: professoresCount,
        aulas: aulasPeriodo.length,
        presencas,
        ausentes,
        visitantes,
        ofertas,
        frequencia
    };
}

function mostrarTendencia(elementoId, atual, anterior) {
    const elemento = document.getElementById(elementoId);
    if (!elemento) return;

    elemento.classList.remove("trend-up", "trend-down", "trend-neutral");

    if (anterior === 0 && atual === 0) {
        elemento.textContent = "— sem alteração";
        elemento.classList.add("trend-neutral");
        return;
    }

    if (anterior === 0) {
        elemento.textContent = "↑ novo";
        elemento.classList.add("trend-up");
        return;
    }

    const diferenca = atual - anterior;
    const percentual = (diferenca / anterior) * 100;

    if (Math.abs(percentual) < 1) {
        elemento.textContent = "→ estável";
        elemento.classList.add("trend-neutral");
        return;
    }

    elemento.textContent = `${percentual > 0 ? "↑" : "↓"} ${Math.abs(percentual).toFixed(1)}%`;
    elemento.classList.add(percentual > 0 ? "trend-up" : "trend-down");
}

function mostrarComparacao(atual, anterior) {
    const container = document.getElementById("metricasComparacao");
    container.innerHTML = "";

    const metricas = [
        { nome: "Alunos", atual: atual.alunos, anterior: anterior.alunos },
        { nome: "Professores", atual: atual.professores, anterior: anterior.professores },
        { nome: "Aulas", atual: atual.aulas, anterior: anterior.aulas },
        { nome: "Presenças", atual: atual.presencas, anterior: anterior.presencas },
        { nome: "Frequência", atual: atual.frequencia, anterior: anterior.frequencia, percentual: true },
        { nome: "Visitantes", atual: atual.visitantes, anterior: anterior.visitantes },
        { nome: "Ofertas", atual: atual.ofertas, anterior: anterior.ofertas, moeda: true }
    ];

    let positivas = 0;
    let negativas = 0;

    metricas.forEach(metrica => {
        const resultado = calcularVariacao(metrica.atual, metrica.anterior);

        if (resultado.tipo === "up") positivas++;
        if (resultado.tipo === "down") negativas++;

        let atualTexto = metrica.atual;
        let anteriorTexto = metrica.anterior;

        if (metrica.moeda) {
            atualTexto = formatarMoeda(metrica.atual);
            anteriorTexto = formatarMoeda(metrica.anterior);
        } else if (metrica.percentual) {
            atualTexto = `${metrica.atual.toFixed(1)}%`;
            anteriorTexto = `${metrica.anterior.toFixed(1)}%`;
        }

        container.innerHTML += `
            <div class="comparison-item">
                <div>
                    <div class="comparison-name">${metrica.nome}</div>
                    <div class="comparison-label">Este mês</div>
                </div>
                <div class="comparison-value">${atualTexto}</div>
                <div class="comparison-value">${anteriorTexto}</div>
                <div class="comparison-change ${resultado.tipo === 'up' ? 'trend-up' : resultado.tipo === 'down' ? 'trend-down' : 'trend-neutral'}">
                    ${resultado.texto}
                </div>
            </div>
        `;
    });

    const resultadoGeral = document.getElementById("resultadoGeral");
    resultadoGeral.classList.remove("resultado-melhor", "resultado-pior", "resultado-estavel");

    if (positivas > negativas) {
        resultadoGeral.textContent = "↑ EBD melhorando";
        resultadoGeral.classList.add("resultado-melhor");
    } else if (negativas > positivas) {
        resultadoGeral.textContent = "↓ EBD em queda";
        resultadoGeral.classList.add("resultado-pior");
    } else {
        resultadoGeral.textContent = "→ EBD estável";
        resultadoGeral.classList.add("resultado-estavel");
    }
}

function calcularVariacao(atual, anterior) {
    if (atual === 0 && anterior === 0) {
        return { tipo: "neutral", texto: "→ 0%" };
    }

    if (anterior === 0) {
        return { tipo: "up", texto: "↑ novo" };
    }

    const variacao = ((atual - anterior) / anterior) * 100;

    if (Math.abs(variacao) < 1) {
        return { tipo: "neutral", texto: "→ estável" };
    }

    return {
        tipo: variacao > 0 ? "up" : "down",
        texto: `${variacao > 0 ? "↑" : "↓"} ${Math.abs(variacao).toFixed(1)}%`
    };
}
