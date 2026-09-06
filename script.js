/* =========================================================
   EBD MANAGER
   SISTEMA DE GESTÃO DA ESCOLA BÍBLICA
   ========================================================= */


/* =========================================================
   DADOS
   ========================================================= */

let classes =
    JSON.parse(
        localStorage.getItem("ebd_classes")
    ) || [];


let aulas =
    JSON.parse(
        localStorage.getItem("ebd_aulas")
    ) || [];


let classeAtual = null;

let aulaEditando = null;

let alunoEditando = null;


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        normalizarDados();

        const data =
            document.getElementById(
                "dataDashboard"
            );

        if (data) {

            data.value =
                obterHoje();

        }


        atualizarDashboard();

    }
);


/* =========================================================
   NORMALIZAR DADOS
   ========================================================= */

function normalizarDados() {

    classes =
        Array.isArray(classes)
            ? classes
            : [];


    aulas =
        Array.isArray(aulas)
            ? aulas
            : [];


    classes.forEach(classe => {

        if (!Array.isArray(classe.alunos)) {

            classe.alunos = [];

        }


        classe.alunos.forEach(aluno => {

            if (
                typeof aluno.ehProfessor !==
                "boolean"
            ) {

                aluno.ehProfessor = false;

            }

        });

    });


    aulas.forEach(aula => {

        if (!Array.isArray(aula.presencas)) {

            aula.presencas = [];

        }

    });


    salvarDados();

}


/* =========================================================
   SALVAR
   ========================================================= */

function salvarDados() {

    localStorage.setItem(
        "ebd_classes",
        JSON.stringify(classes)
    );


    localStorage.setItem(
        "ebd_aulas",
        JSON.stringify(aulas)
    );

}


/* =========================================================
   ID
   ========================================================= */

function gerarId() {

    return (
        Date.now().toString(36) +
        Math.random()
            .toString(36)
            .substring(2, 8)
    );

}


/* =========================================================
   DATA ATUAL
   ========================================================= */

function obterHoje() {

    const hoje = new Date();

    const ano =
        hoje.getFullYear();


    const mes =
        String(
            hoje.getMonth() + 1
        ).padStart(2, "0");


    const dia =
        String(
            hoje.getDate()
        ).padStart(2, "0");


    return `${ano}-${mes}-${dia}`;

}


/* =========================================================
   MOEDA
   ========================================================= */

function formatarMoeda(valor) {

    return Number(valor || 0)
        .toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );

}


/* =========================================================
   DATA
   ========================================================= */

function formatarData(data) {

    if (!data) {
        return "-";
    }


    const partes =
        data.split("-");


    if (partes.length !== 3) {
        return data;
    }


    return (
        partes[2] +
        "/" +
        partes[1] +
        "/" +
        partes[0]
    );

}


/* =========================================================
   OBTER CLASSE
   ========================================================= */

function obterClasse(id) {

    return classes.find(
        classe =>
            String(classe.id) ===
            String(id)
    );

}


/* =========================================================
   ESCONDER TELAS
   ========================================================= */

function esconderTodasTelas() {

    const telas = [

        "dashboard",

        "dashboardMetricas",

        "telaClasse",

        "telaAula",

        "telaHistorico"

    ];


    telas.forEach(id => {

        const elemento =
            document.getElementById(id);


        if (elemento) {

            elemento.classList.add(
                "hidden"
            );

        }

    });

}


/* =========================================================
   DASHBOARD
   ========================================================= */

function voltarDashboard() {

    esconderTodasTelas();


    document
        .getElementById("dashboard")
        .classList.remove("hidden");


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


    classes.forEach(
        classe => {

            totalAlunos +=
                classe.alunos.length;

        }
    );


    const dataSelecionada =
        document.getElementById(
            "dataDashboard"
        )?.value ||
        obterHoje();


    const aulasDoDia =
        aulas.filter(
            aula =>
                aula.data ===
                dataSelecionada
        );


    let presencas = 0;

    let ausentes = 0;

    let visitantes = 0;

    let ofertas = 0;


    aulasDoDia.forEach(aula => {

        aula.presencas.forEach(
            registro => {

                if (
                    registro.status ===
                    "presente"
                ) {

                    presencas++;

                } else {

                    ausentes++;

                }

            }
        );


        visitantes +=
            Number(
                aula.visitantes || 0
            );


        ofertas +=
            Number(
                aula.oferta || 0
            );

    });


    document.getElementById(
        "totalClasses"
    ).textContent =
        classes.length;


    document.getElementById(
        "totalAlunos"
    ).textContent =
        totalAlunos;


    document.getElementById(
        "totalPresencas"
    ).textContent =
        presencas;


    document.getElementById(
        "totalAusentes"
    ).textContent =
        ausentes;


    document.getElementById(
        "totalVisitantes"
    ).textContent =
        visitantes;


    document.getElementById(
        "totalOfertas"
    ).textContent =
        formatarMoeda(ofertas);

}


/* =========================================================
   RESUMO DO DIA
   ========================================================= */

function mostrarResumoDoDia() {

    const container =
        document.getElementById(
            "resumoDoDia"
        );


    if (!container) return;


    const dataSelecionada =
        document.getElementById(
            "dataDashboard"
        )?.value ||
        obterHoje();


    const aulasDoDia =
        aulas.filter(
            aula =>
                aula.data ===
                dataSelecionada
        );


    if (
        aulasDoDia.length === 0
    ) {

        container.innerHTML = `

            <div class="daily-summary-card">

                <span>
                    Aulas
                </span>

                <strong>
                    0
                </strong>

            </div>


            <div class="daily-summary-card">

                <span>
                    Presenças
                </span>

                <strong>
                    0
                </strong>

            </div>


            <div class="daily-summary-card">

                <span>
                    Visitantes
                </span>

                <strong>
                    0
                </strong>

            </div>


            <div class="daily-summary-card">

                <span>
                    Ofertas
                </span>

                <strong>
                    R$ 0,00
                </strong>

            </div>

        `;

        return;

    }


    let presencas = 0;

    let visitantes = 0;

    let ofertas = 0;


    aulasDoDia.forEach(aula => {

        aula.presencas.forEach(
            registro => {

                if (
                    registro.status ===
                    "presente"
                ) {

                    presencas++;

                }

            }
        );


        visitantes +=
            Number(
                aula.visitantes || 0
            );


        ofertas +=
            Number(
                aula.oferta || 0
            );

    });


    container.innerHTML = `

        <div class="daily-summary-card">

            <span>
                Aulas
            </span>

            <strong>
                ${aulasDoDia.length}
            </strong>

        </div>


        <div class="daily-summary-card">

            <span>
                Presenças
            </span>

            <strong>
                ${presencas}
            </strong>

        </div>


        <div class="daily-summary-card">

            <span>
                Visitantes
            </span>

            <strong>
                ${visitantes}
            </strong>

        </div>


        <div class="daily-summary-card">

            <span>
                Ofertas
            </span>

            <strong>
                ${formatarMoeda(ofertas)}
            </strong>

        </div>

    `;

}


/* =========================================================
   MOSTRAR CLASSES
   ========================================================= */

function mostrarClasses() {

    const container =
        document.getElementById(
            "listaClasses"
        );


    if (!container) return;


    container.innerHTML = "";


    if (classes.length === 0) {

        container.innerHTML = `

            <div class="empty-state">

                <strong>
                    Nenhuma classe cadastrada.
                </strong>

                <br><br>

                Cadastre sua primeira classe
                para começar.

            </div>

        `;

        return;

    }


    classes.forEach(classe => {

        const aulasClasse =
            aulas.filter(
                aula =>
                    String(aula.classeId) ===
                    String(classe.id)
            );


        let presencas = 0;


        aulasClasse.forEach(aula => {

            aula.presencas.forEach(
                registro => {

                    if (
                        registro.status ===
                        "presente"
                    ) {

                        presencas++;

                    }

                }
            );

        });


        container.innerHTML += `

            <div
                class="class-card"
                onclick="abrirClasse('${classe.id}')"
            >

                <div class="class-card-header">

                    <div>

                        <h3>
                            ${classe.nome}
                        </h3>

                        <div class="class-card-info">

                            ${classe.dia}
                            •
                            ${classe.horario}

                        </div>

                    </div>

                </div>


                <div class="class-card-stats">

                    <div class="class-mini-stat">

                        <span>
                            Alunos
                        </span>

                        <strong>
                            ${classe.alunos.length}
                        </strong>

                    </div>


                    <div class="class-mini-stat">

                        <span>
                            Aulas
                        </span>

                        <strong>
                            ${aulasClasse.length}
                        </strong>

                    </div>


                    <div class="class-mini-stat">

                        <span>
                            Presenças
                        </span>

                        <strong>
                            ${presencas}
                        </strong>

                    </div>

                </div>

            </div>

        `;

    });

}


/* =========================================================
   MODAL CLASSE
   ========================================================= */

function abrirModalClasse() {

    document.getElementById(
        "nomeClasse"
    ).value = "";


    document.getElementById(
        "diaClasse"
    ).value = "Domingo";


    document.getElementById(
        "horarioClasse"
    ).value = "09:00";


    document
        .getElementById("modalClasse")
        .classList.remove("hidden");

}


function fecharModalClasse() {

    document
        .getElementById("modalClasse")
        .classList.add("hidden");

}


/* =========================================================
   SALVAR CLASSE
   ========================================================= */

function salvarClasse() {

    const nome =
        document.getElementById(
            "nomeClasse"
        ).value.trim();


    const dia =
        document.getElementById(
            "diaClasse"
        ).value;


    const horario =
        document.getElementById(
            "horarioClasse"
        ).value;


    if (!nome) {

        alert(
            "Digite o nome da classe."
        );

        return;

    }


    if (!horario) {

        alert(
            "Informe o horário."
        );

        return;

    }


    classes.push({

        id: gerarId(),

        nome,

        dia,

        horario,

        alunos: []

    });


    salvarDados();

    fecharModalClasse();

    atualizarDashboard();


    alert(
        "Classe cadastrada com sucesso!"
    );

}


/* =========================================================
   ABRIR CLASSE
   ========================================================= */

function abrirClasse(id) {

    const classe =
        obterClasse(id);


    if (!classe) {

        alert(
            "Classe não encontrada."
        );

        return;

    }


    classeAtual = classe;


    esconderTodasTelas();


    document
        .getElementById("telaClasse")
        .classList.remove("hidden");


    mostrarDadosClasse();

}


/* =========================================================
   DADOS DA CLASSE
   ========================================================= */

function mostrarDadosClasse() {

    if (!classeAtual) return;


    classeAtual =
        obterClasse(
            classeAtual.id
        );


    if (!classeAtual) {

        alert(
            "Classe não encontrada."
        );

        voltarDashboard();

        return;

    }


    const aulasClasse =
        aulas.filter(
            aula =>
                String(aula.classeId) ===
                String(classeAtual.id)
        );


    document.getElementById(
        "tituloClasse"
    ).textContent =
        classeAtual.nome;


    document.getElementById(
        "infoClasse"
    ).textContent =
        classeAtual.dia +
        " • " +
        classeAtual.horario;


    document.getElementById(
        "classeNomeCard"
    ).textContent =
        classeAtual.nome;


    let presencas = 0;

    let ausentes = 0;

    let visitantes = 0;

    let ofertas = 0;


    aulasClasse.forEach(aula => {

        aula.presencas.forEach(
            registro => {

                if (
                    registro.status ===
                    "presente"
                ) {

                    presencas++;

                } else {

                    ausentes++;

                }

            }
        );


        visitantes +=
            Number(
                aula.visitantes || 0
            );


        ofertas +=
            Number(
                aula.oferta || 0
            );

    });


    const totalPossivel =
        classeAtual.alunos.length *
        aulasClasse.length;


    const frequencia =
        totalPossivel > 0
            ? (
                presencas /
                totalPossivel
            ) * 100
            : 0;


    document.getElementById(
        "classeTotalAlunos"
    ).textContent =
        classeAtual.alunos.length;


    document.getElementById(
        "classeTotalAulas"
    ).textContent =
        aulasClasse.length;


    document.getElementById(
        "classeTotalPresencas"
    ).textContent =
        presencas;


    document.getElementById(
        "classeTotalAusentes"
    ).textContent =
        ausentes;


    document.getElementById(
        "classeTotalVisitantes"
    ).textContent =
        visitantes;


    document.getElementById(
        "classeTotalOfertas"
    ).textContent =
        formatarMoeda(ofertas);


    document.getElementById(
        "classeFrequencia"
    ).textContent =
        frequencia.toFixed(1) +
        "%";


    document.getElementById(
        "resumoNomeClasse"
    ).textContent =
        classeAtual.nome;


    document.getElementById(
        "resumoInfoClasse"
    ).textContent =
        classeAtual.dia +
        " • " +
        classeAtual.horario;


    document.getElementById(
        "resumoAulas"
    ).textContent =
        aulasClasse.length;


    document.getElementById(
        "resumoPresencas"
    ).textContent =
        presencas;


    document.getElementById(
        "resumoVisitantes"
    ).textContent =
        visitantes;


    document.getElementById(
        "resumoOfertas"
    ).textContent =
        formatarMoeda(ofertas);


    mostrarRanking();

    mostrarAlunosClasse();

    mostrarAulasClasse();

}


/* =========================================================
   RANKING
   ========================================================= */

function mostrarRanking() {

    const container =
        document.getElementById(
            "rankingAlunos"
        );


    if (!container) return;


    container.innerHTML = "";


    if (
        !classeAtual ||
        classeAtual.alunos.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-state">

                Nenhum aluno cadastrado.

            </div>

        `;

        return;

    }


    const aulasClasse =
        aulas.filter(
            aula =>
                String(aula.classeId) ===
                String(classeAtual.id)
        );


    const ranking =
        classeAtual.alunos.map(
            aluno => {

                let presentes = 0;

                let ausentes = 0;


                aulasClasse.forEach(
                    aula => {

                        const registro =
                            aula.presencas.find(
                                item =>
                                    String(
                                        item.alunoId
                                    ) ===
                                    String(
                                        aluno.id
                                    )
                            );


                        if (!registro) {
                            return;
                        }


                        if (
                            registro.status ===
                            "presente"
                        ) {

                            presentes++;

                        } else {

                            ausentes++;

                        }

                    }
                );


                const total =
                    presentes +
                    ausentes;


                const frequencia =
                    total > 0
                        ? (
                            presentes /
                            total
                        ) * 100
                        : 0;


                return {

                    aluno,

                    presentes,

                    ausentes,

                    frequencia

                };

            }
        );


    ranking.sort(
        (a, b) =>
            b.frequencia -
            a.frequencia
    );


    ranking.forEach(
        (item, index) => {

            container.innerHTML += `

                <div class="ranking-item">

                    <div class="ranking-position">

                        ${index + 1}

                    </div>


                    <div class="ranking-name">

                        <strong>
                            ${item.aluno.nome}
                        </strong>

                        <span>

                            ${
                                item.aluno.ehProfessor
                                    ? "Professor"
                                    : "Aluno"
                            }

                        </span>

                    </div>


                    <div class="ranking-number">

                        <span>
                            Presenças
                        </span>

                        <strong>
                            ${item.presentes}
                        </strong>

                    </div>


                    <div>

                        <div class="frequency-bar">

                            <div
                                style="
                                    width:
                                    ${item.frequencia}%
                                "
                            ></div>

                        </div>

                        <div
                            class="ranking-number"
                            style="margin-top:5px"
                        >

                            <strong>
                                ${item.frequencia.toFixed(1)}%
                            </strong>

                        </div>

                    </div>

                </div>

            `;

        }
    );

}


/* =========================================================
   ALUNOS DA CLASSE
   ========================================================= */

function mostrarAlunosClasse() {

    const container =
        document.getElementById(
            "alunosClasse"
        );


    if (!container) return;


    container.innerHTML = "";


    if (
        !classeAtual ||
        classeAtual.alunos.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-state">

                Nenhum aluno cadastrado nesta classe.

            </div>

        `;

        return;

    }


    classeAtual.alunos.forEach(
        aluno => {

            const iniciais =
                aluno.nome
                    .split(" ")
                    .slice(0, 2)
                    .map(
                        nome =>
                            nome.charAt(0)
                                .toUpperCase()
                    )
                    .join("");


            container.innerHTML += `

                <div class="student-item">

                    <div class="student-info">

                        <div class="student-avatar">

                            ${iniciais}

                        </div>


                        <div>

                            <strong>
                                ${aluno.nome}
                            </strong>

                            <span>

                                ${
                                    aluno.ehProfessor
                                        ? "Professor"
                                        : "Aluno"
                                }

                                ${
                                    aluno.telefone
                                        ? " • " +
                                          aluno.telefone
                                        : ""
                                }

                            </span>

                        </div>

                    </div>


                    <div class="student-actions">

                        <button
                            class="icon-button"
                            onclick="
                                editarAluno(
                                    '${aluno.id}'
                                )
                            "
                            title="Editar aluno"
                        >
                            ✎
                        </button>

                    </div>

                </div>

            `;

        }
    );

}


/* =========================================================
   AULAS DA CLASSE
   ========================================================= */

function mostrarAulasClasse() {

    const container =
        document.getElementById(
            "aulasClasse"
        );


    if (!container) return;


    container.innerHTML = "";


    if (!classeAtual) return;


    const aulasClasse =
        aulas
            .filter(
                aula =>
                    String(aula.classeId) ===
                    String(classeAtual.id)
            )
            .sort(
                (a, b) =>
                    b.data.localeCompare(
                        a.data
                    )
            )
            .slice(0, 8);


    if (aulasClasse.length === 0) {

        container.innerHTML = `

            <div class="empty-state">

                Nenhuma aula registrada.

            </div>

        `;

        return;

    }


    aulasClasse.forEach(
        aula =>
            adicionarCardAula(
                aula,
                container
            )
    );

}


/* =========================================================
   CARD AULA
   ========================================================= */

function adicionarCardAula(
    aula,
    container
) {

    let presencas = 0;

    let ausentes = 0;


    aula.presencas.forEach(
        registro => {

            if (
                registro.status ===
                "presente"
            ) {

                presencas++;

            } else {

                ausentes++;

            }

        }
    );


    container.innerHTML += `

        <div class="lesson-card">

            <div class="lesson-header">

                <div>

                    <div class="lesson-date">

                        ${formatarData(aula.data)}

                    </div>

                    <h3>
                        ${aula.tema || "Sem tema"}
                    </h3>

                    <div class="lesson-professor">

                        Professor:
                        ${aula.professorNome || "-"}

                    </div>

                </div>

            </div>


            <div class="lesson-stats">

                <div class="lesson-stat">

                    <span>
                        Presenças
                    </span>

                    <strong>
                        ${presencas}
                    </strong>

                </div>


                <div class="lesson-stat">

                    <span>
                        Visitantes
                    </span>

                    <strong>
                        ${aula.visitantes || 0}
                    </strong>

                </div>


                <div class="lesson-stat">

                    <span>
                        Oferta
                    </span>

                    <strong>
                        ${formatarMoeda(aula.oferta)}
                    </strong>

                </div>

            </div>


            <div class="lesson-actions">

                <button
                    class="icon-button"
                    title="Editar aula"
                    onclick="
                        editarAula(
                            '${aula.id}'
                        )
                    "
                >
                    ✎
                </button>


                <button
                    class="delete-button"
                    title="Excluir aula"
                    onclick="
                        event.stopPropagation();
                        excluirAula(
                            '${aula.id}'
                        )
                    "
                >
                    ×
                </button>

            </div>

        </div>

    `;

}


/* =========================================================
   MODAL ALUNO
   ========================================================= */

function abrirModalAluno() {

    alunoEditando = null;


    document.getElementById(
        "tituloModalAluno"
    ).textContent =
        "Novo Aluno";


    document.getElementById(
        "nomeAluno"
    ).value = "";


    document.getElementById(
        "telefoneAluno"
    ).value = "";


    document.getElementById(
        "dataNascimentoAluno"
    ).value = "";


    document.getElementById(
        "ehProfessor"
    ).checked = false;


    carregarSelectClasses();


    document.getElementById(
        "classeAluno"
    ).value = "";


    document
        .getElementById("modalAluno")
        .classList.remove("hidden");

}


function abrirModalAlunoClasseAtual() {

    abrirModalAluno();


    if (classeAtual) {

        document.getElementById(
            "classeAluno"
        ).value =
            classeAtual.id;

    }

}


function fecharModalAluno() {

    document
        .getElementById("modalAluno")
        .classList.add("hidden");


    alunoEditando = null;

}


/* =========================================================
   CARREGAR CLASSES NO SELECT
   ========================================================= */

function carregarSelectClasses() {

    const select =
        document.getElementById(
            "classeAluno"
        );


    select.innerHTML = `

        <option value="">
            Selecione a classe
        </option>

    `;


    classes.forEach(
        classe => {

            select.innerHTML += `

                <option value="${classe.id}">

                    ${classe.nome}

                </option>

            `;

        }
    );

}


/* =========================================================
   SALVAR ALUNO
   ========================================================= */

function salvarAluno() {

    const nome =
        document.getElementById(
            "nomeAluno"
        ).value.trim();


    const telefone =
        document.getElementById(
            "telefoneAluno"
        ).value.trim();


    const dataNascimento =
        document.getElementById(
            "dataNascimentoAluno"
        ).value;


    const classeId =
        document.getElementById(
            "classeAluno"
        ).value;


    const ehProfessor =
        document.getElementById(
            "ehProfessor"
        ).checked;


    if (!nome) {

        alert(
            "Digite o nome do aluno."
        );

        return;

    }


    if (!classeId) {

        alert(
            "Selecione uma classe."
        );

        return;

    }


    const classe =
        obterClasse(classeId);


    if (!classe) {

        alert(
            "Classe não encontrada."
        );

        return;

    }


    /* ================= EDITANDO ================= */

    if (alunoEditando) {

        let classeAntiga = null;

        let alunoEncontrado = null;


        classes.forEach(
            item => {

                const aluno =
                    item.alunos.find(
                        a =>
                            String(a.id) ===
                            String(
                                alunoEditando
                            )
                    );


                if (aluno) {

                    classeAntiga = item;

                    alunoEncontrado =
                        aluno;

                }

            }
        );


        if (!alunoEncontrado) {

            alert(
                "Aluno não encontrado."
            );

            return;

        }


        alunoEncontrado.nome =
            nome;


        alunoEncontrado.telefone =
            telefone;


        alunoEncontrado.dataNascimento =
            dataNascimento;


        alunoEncontrado.ehProfessor =
            ehProfessor;


        /* MUDOU DE CLASSE */

        if (
            String(
                classeAntiga.id
            ) !==
            String(classe.id)
        ) {

            classeAntiga.alunos =
                classeAntiga.alunos.filter(
                    aluno =>
                        String(aluno.id) !==
                        String(
                            alunoEditando
                        )
                );


            classe.alunos.push(
                alunoEncontrado
            );

        }


        salvarDados();

        fecharModalAluno();


        if (classeAtual) {

            classeAtual =
                obterClasse(
                    classeAtual.id
                );

            mostrarDadosClasse();

        }


        atualizarDashboard();


        alert(
            "Aluno atualizado com sucesso!"
        );


        return;

    }


    /* ================= NOVO ALUNO ================= */

    classe.alunos.push({

        id: gerarId(),

        nome,

        telefone,

        dataNascimento,

        ehProfessor

    });


    salvarDados();

    fecharModalAluno();

    atualizarDashboard();


    alert(
        "Aluno cadastrado com sucesso!"
    );


    if (classeAtual) {

        classeAtual =
            obterClasse(
                classeAtual.id
            );

        mostrarDadosClasse();

    }

}


/* =========================================================
   EDITAR ALUNO
   ========================================================= */

function editarAluno(id) {

    let aluno = null;

    let classeDoAluno = null;


    classes.forEach(
        classe => {

            const encontrado =
                classe.alunos.find(
                    item =>
                        String(item.id) ===
                        String(id)
                );


            if (encontrado) {

                aluno = encontrado;

                classeDoAluno = classe;

            }

        }
    );


    if (!aluno) {

        alert(
            "Aluno não encontrado."
        );

        return;

    }


    alunoEditando = aluno.id;


    document.getElementById(
        "tituloModalAluno"
    ).textContent =
        "Editar Aluno";


    document.getElementById(
        "nomeAluno"
    ).value =
        aluno.nome || "";


    document.getElementById(
        "telefoneAluno"
    ).value =
        aluno.telefone || "";


    document.getElementById(
        "dataNascimentoAluno"
    ).value =
        aluno.dataNascimento || "";


    document.getElementById(
        "ehProfessor"
    ).checked =
        aluno.ehProfessor === true;


    carregarSelectClasses();


    document.getElementById(
        "classeAluno"
    ).value =
        classeDoAluno.id;


    document
        .getElementById("modalAluno")
        .classList.remove("hidden");

}


/* =========================================================
   NOVA AULA
   ========================================================= */

function abrirNovaAula() {

    if (!classeAtual) {

        alert(
            "Selecione uma classe."
        );

        return;

    }


    const professores =
        classeAtual.alunos.filter(
            aluno =>
                aluno.ehProfessor === true
        );


    if (professores.length === 0) {

        alert(
            "Esta classe ainda não possui nenhum aluno marcado como professor.\n\n" +
            "Abra o cadastro de um aluno e marque a opção " +
            "\"Este aluno também é professor\"."
        );

        return;

    }


    aulaEditando = null;


    esconderTodasTelas();


    document
        .getElementById("telaAula")
        .classList.remove("hidden");


    document.getElementById(
        "tituloAula"
    ).textContent =
        "Nova Aula";


    document.getElementById(
        "subtituloAula"
    ).textContent =
        classeAtual.nome;


    document.getElementById(
        "dataAula"
    ).value =
        obterHoje();


    document.getElementById(
        "temaAula"
    ).value = "";


    document.getElementById(
        "visitantesAula"
    ).value = 0;


    document.getElementById(
        "ofertaAula"
    ).value = 0;


    carregarProfessores();


    mostrarChamada();

}


/* =========================================================
   PROFESSORES
   ========================================================= */

function carregarProfessores(
    professorSelecionado = ""
) {

    const select =
        document.getElementById(
            "professorAula"
        );


    select.innerHTML = `

        <option value="">
            Selecione o professor
        </option>

    `;


    if (!classeAtual) return;


    const professores =
        classeAtual.alunos.filter(
            aluno =>
                aluno.ehProfessor === true
        );


    professores.forEach(
        professor => {

            select.innerHTML += `

                <option
                    value="${professor.id}"
                >

                    ${professor.nome}

                </option>

            `;

        }
    );


    if (professorSelecionado) {

        select.value =
            professorSelecionado;

    }

}


/* =========================================================
   CHAMADA
   ========================================================= */

function mostrarChamada(
    registrosExistentes = []
) {

    const container =
        document.getElementById(
            "listaChamada"
        );


    container.innerHTML = "";


    if (!classeAtual) return;


    classeAtual.alunos.forEach(
        aluno => {

            const registro =
                registrosExistentes.find(
                    item =>
                        String(
                            item.alunoId
                        ) ===
                        String(
                            aluno.id
                        )
                );


            const status =
                registro
                    ? registro.status
                    : "ausente";


            container.innerHTML += `

                <div class="attendance-item">

                    <div class="attendance-student">

                        <div class="student-avatar">

                            ${
                                aluno.nome
                                    .charAt(0)
                                    .toUpperCase()
                            }

                        </div>


                        <strong>
                            ${aluno.nome}
                        </strong>

                    </div>


                    <div
                        class="attendance-buttons"
                    >

                        <button
                            id="presente-${aluno.id}"
                            class="
                                attendance-btn
                                ${
                                    status ===
                                    "presente"
                                        ? "present"
                                        : ""
                                }
                            "
                            onclick="
                                marcarPresenca(
                                    '${aluno.id}',
                                    'presente'
                                )
                            "
                        >
                            ✓ Presente
                        </button>


                        <button
                            id="ausente-${aluno.id}"
                            class="
                                attendance-btn
                                ${
                                    status ===
                                    "ausente"
                                        ? "absent"
                                        : ""
                                }
                            "
                            onclick="
                                marcarPresenca(
                                    '${aluno.id}',
                                    'ausente'
                                )
                            "
                        >
                            × Ausente
                        </button>

                    </div>

                </div>

            `;

        }
    );


    atualizarContadorPresenca();

}


/* =========================================================
   MARCAR PRESENÇA
   ========================================================= */

function marcarPresenca(
    alunoId,
    status
) {

    const presente =
        document.getElementById(
            `presente-${alunoId}`
        );


    const ausente =
        document.getElementById(
            `ausente-${alunoId}`
        );


    if (!presente || !ausente) {
        return;
    }


    presente.classList.remove(
        "present"
    );


    ausente.classList.remove(
        "absent"
    );


    if (
        status ===
        "presente"
    ) {

        presente.classList.add(
            "present"
        );

    } else {

        ausente.classList.add(
            "absent"
        );

    }


    atualizarContadorPresenca();

}


/* =========================================================
   CONTADOR
   ========================================================= */

function atualizarContadorPresenca() {

    if (!classeAtual) return;


    let presentes = 0;


    classeAtual.alunos.forEach(
        aluno => {

            const botao =
                document.getElementById(
                    `presente-${aluno.id}`
                );


            if (
                botao &&
                botao.classList.contains(
                    "present"
                )
            ) {

                presentes++;

            }

        }
    );


    const contador =
        document.getElementById(
            "contadorPresenca"
        );


    if (contador) {

        contador.textContent =
            `${presentes} ${
                presentes === 1
                    ? "presente"
                    : "presentes"
            }`;

    }

}


/* =========================================================
   SALVAR AULA
   ========================================================= */

function salvarAula() {

    if (!classeAtual) {

        alert(
            "Classe não encontrada."
        );

        return;

    }


    const data =
        document.getElementById(
            "dataAula"
        ).value;


    const tema =
        document.getElementById(
            "temaAula"
        ).value.trim();


    const professorId =
        document.getElementById(
            "professorAula"
        ).value;


    const visitantes =
        Number(
            document.getElementById(
                "visitantesAula"
            ).value || 0
        );


    const oferta =
        Number(
            document.getElementById(
                "ofertaAula"
            ).value || 0
        );


    if (!data) {

        alert(
            "Informe a data da aula."
        );

        return;

    }


    if (!tema) {

        alert(
            "Informe o tema da aula."
        );

        return;

    }


    if (!professorId) {

        alert(
            "Selecione o professor."
        );

        return;

    }


    const professor =
        classeAtual.alunos.find(
            aluno =>
                String(aluno.id) ===
                String(professorId)
        );


    if (!professor) {

        alert(
            "Professor não encontrado."
        );

        return;

    }


    const presencas =
        classeAtual.alunos.map(
            aluno => {

                const presente =
                    document
                        .getElementById(
                            `presente-${aluno.id}`
                        )
                        ?.classList.contains(
                            "present"
                        );


                return {

                    alunoId:
                        aluno.id,

                    alunoNome:
                        aluno.nome,

                    status:
                        presente
                            ? "presente"
                            : "ausente"

                };

            }
        );


    /* ================= EDITAR ================= */

    if (aulaEditando) {

        const aula =
            aulas.find(
                item =>
                    String(item.id) ===
                    String(aulaEditando)
            );


        if (!aula) {

            alert(
                "Aula não encontrada."
            );

            return;

        }


        aula.classeId =
            classeAtual.id;


        aula.classeNome =
            classeAtual.nome;


        aula.data =
            data;


        aula.tema =
            tema;


        aula.professorId =
            professor.id;


        aula.professorNome =
            professor.nome;


        aula.visitantes =
            visitantes;


        aula.oferta =
            oferta;


        aula.presencas =
            presencas;


        salvarDados();


        aulaEditando = null;


        voltarClasse();


        alert(
            "Aula atualizada com sucesso!"
        );


        return;

    }


    /* ================= NOVA ================= */

    aulas.push({

        id: gerarId(),

        classeId:
            classeAtual.id,

        classeNome:
            classeAtual.nome,

        data,

        tema,

        professorId:
            professor.id,

        professorNome:
            professor.nome,

        visitantes,

        oferta,

        presencas

    });


    salvarDados();


    voltarClasse();


    alert(
        "Aula registrada com sucesso!"
    );

}


/* =========================================================
   EDITAR AULA
   ========================================================= */

function editarAula(id) {

    const aula =
        aulas.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!aula) {

        alert(
            "Aula não encontrada."
        );

        return;

    }


    const classe =
        obterClasse(
            aula.classeId
        );


    if (!classe) {

        alert(
            "Classe da aula não encontrada."
        );

        return;

    }


    classeAtual = classe;

    aulaEditando = aula.id;


    esconderTodasTelas();


    document
        .getElementById("telaAula")
        .classList.remove("hidden");


    document.getElementById(
        "tituloAula"
    ).textContent =
        "Editar Aula";


    document.getElementById(
        "subtituloAula"
    ).textContent =
        classe.nome;


    document.getElementById(
        "dataAula"
    ).value =
        aula.data;


    document.getElementById(
        "temaAula"
    ).value =
        aula.tema || "";


    document.getElementById(
        "visitantesAula"
    ).value =
        aula.visitantes || 0;


    document.getElementById(
        "ofertaAula"
    ).value =
        aula.oferta || 0;


    carregarProfessores(
        aula.professorId
    );


    mostrarChamada(
        aula.presencas || []
    );

}


/* =========================================================
   EXCLUIR AULA
   ========================================================= */

function excluirAula(
    aulaId
) {

    const aula =
        aulas.find(
            item =>
                String(item.id) ===
                String(aulaId)
        );


    if (!aula) {

        alert(
            "Aula não encontrada."
        );

        return;

    }


    const confirmacao =
        confirm(

            `Deseja realmente excluir esta aula?\n\n` +

            `Data: ${formatarData(aula.data)}\n` +

            `Tema: ${aula.tema}\n\n` +

            `Essa ação não poderá ser desfeita.`

        );


    if (!confirmacao) {

        return;

    }


    aulas =
        aulas.filter(
            item =>
                String(item.id) !==
                String(aulaId)
        );


    salvarDados();


    if (classeAtual) {

        classeAtual =
            obterClasse(
                classeAtual.id
            );


        mostrarDadosClasse();

    }


    atualizarDashboard();


    alert(
        "Aula excluída com sucesso!"
    );

}


/* =========================================================
   VOLTAR PARA CLASSE
   ========================================================= */

function voltarClasse() {

    if (!classeAtual) {

        voltarDashboard();

        return;

    }


    esconderTodasTelas();


    document
        .getElementById("telaClasse")
        .classList.remove("hidden");


    aulaEditando = null;


    mostrarDadosClasse();

}


/* =========================================================
   HISTÓRICO
   ========================================================= */

function abrirHistorico() {

    if (!classeAtual) return;


    esconderTodasTelas();


    document
        .getElementById("telaHistorico")
        .classList.remove("hidden");


    document.getElementById(
        "subtituloHistorico"
    ).textContent =
        classeAtual.nome;


    mostrarHistorico();

}


/* =========================================================
   MOSTRAR HISTÓRICO
   ========================================================= */

function mostrarHistorico() {

    const container =
        document.getElementById(
            "listaHistorico"
        );


    container.innerHTML = "";


    if (!classeAtual) return;


    const aulasClasse =
        aulas
            .filter(
                aula =>
                    String(aula.classeId) ===
                    String(classeAtual.id)
            )
            .sort(
                (a, b) =>
                    b.data.localeCompare(
                        a.data
                    )
            );


    if (aulasClasse.length === 0) {

        container.innerHTML = `

            <div class="panel">

                <div class="empty-state">

                    Nenhuma aula registrada.

                </div>

            </div>

        `;

        return;

    }


    aulasClasse.forEach(
        aula => {

            const presencas =
                aula.presencas.filter(
                    registro =>
                        registro.status ===
                        "presente"
                ).length;


            const ausentes =
                aula.presencas.filter(
                    registro =>
                        registro.status ===
                        "ausente"
                ).length;


            container.innerHTML += `

                <div class="history-item">

                    <div class="history-info">

                        <strong>
                            ${aula.tema}
                        </strong>

                        <span>

                            ${formatarData(aula.data)}

                            •

                            Professor:
                            ${aula.professorNome}

                        </span>

                    </div>


                    <div class="history-stats">

                        <div class="history-stat">

                            <span>
                                Presentes
                            </span>

                            <strong>
                                ${presencas}
                            </strong>

                        </div>


                        <div class="history-stat">

                            <span>
                                Ausentes
                            </span>

                            <strong>
                                ${ausentes}
                            </strong>

                        </div>


                        <div class="history-stat">

                            <span>
                                Visitantes
                            </span>

                            <strong>
                                ${aula.visitantes || 0}
                            </strong>

                        </div>


                        <div class="history-stat">

                            <span>
                                Oferta
                            </span>

                            <strong>
                                ${formatarMoeda(aula.oferta)}
                            </strong>

                        </div>


                        <button
                            class="icon-button"
                            title="Editar"
                            onclick="
                                editarAula(
                                    '${aula.id}'
                                )
                            "
                        >
                            ✎
                        </button>


                        <button
                            class="delete-button"
                            title="Excluir"
                            onclick="
                                excluirAula(
                                    '${aula.id}'
                                )
                            "
                        >
                            ×
                        </button>

                    </div>

                </div>

            `;

        }
    );

}


/* =========================================================
   DASHBOARD DE MÉTRICAS
   ========================================================= */

function abrirDashboardMetricas() {

    esconderTodasTelas();


    document
        .getElementById(
            "dashboardMetricas"
        )
        .classList.remove("hidden");


    calcularMetricas();

}


/* =========================================================
   PERÍODO
   ========================================================= */

function obterPeriodoMeses(
    deslocamento = 0
) {

    const hoje =
        new Date();


    const data =
        new Date(
            hoje.getFullYear(),
            hoje.getMonth() +
                deslocamento,
            1
        );


    return {

        ano:
            data.getFullYear(),

        mes:
            data.getMonth()

    };

}


/* =========================================================
   CALCULAR MÉTRICAS
   ========================================================= */

function calcularMetricas() {

    const atual =
        obterPeriodoMeses(0);


    const anterior =
        obterPeriodoMeses(-1);


    const dadosAtual =
        calcularPeriodo(
            atual.ano,
            atual.mes
        );


    const dadosAnterior =
        calcularPeriodo(
            anterior.ano,
            anterior.mes
        );


    document.getElementById(
        "metricaClasses"
    ).textContent =
        dadosAtual.classes;


    document.getElementById(
        "metricaAlunos"
    ).textContent =
        dadosAtual.alunos;


    document.getElementById(
        "metricaProfessores"
    ).textContent =
        dadosAtual.professores;


    document.getElementById(
        "metricaAulas"
    ).textContent =
        dadosAtual.aulas;


    document.getElementById(
        "metricaPresencas"
    ).textContent =
        dadosAtual.presencas;


    document.getElementById(
        "metricaFrequencia"
    ).textContent =
        dadosAtual.frequencia.toFixed(1) +
        "%";


    document.getElementById(
        "metricaVisitantes"
    ).textContent =
        dadosAtual.visitantes;


    document.getElementById(
        "metricaOfertas"
    ).textContent =
        formatarMoeda(
            dadosAtual.ofertas
        );


    mostrarTendencia(
        "trendClasses",
        dadosAtual.classes,
        dadosAnterior.classes
    );


    mostrarTendencia(
        "trendAlunos",
        dadosAtual.alunos,
        dadosAnterior.alunos
    );


    mostrarTendencia(
        "trendProfessores",
        dadosAtual.professores,
        dadosAnterior.professores
    );


    mostrarTendencia(
        "trendAulas",
        dadosAtual.aulas,
        dadosAnterior.aulas
    );


    mostrarTendencia(
        "trendPresencas",
        dadosAtual.presencas,
        dadosAnterior.presencas
    );


    mostrarTendencia(
        "trendFrequencia",
        dadosAtual.frequencia,
        dadosAnterior.frequencia
    );


    mostrarTendencia(
        "trendVisitantes",
        dadosAtual.visitantes,
        dadosAnterior.visitantes
    );


    mostrarTendencia(
        "trendOfertas",
        dadosAtual.ofertas,
        dadosAnterior.ofertas
    );


    mostrarComparacao(
        dadosAtual,
        dadosAnterior
    );


    mostrarDesempenhoClasses();

}


/* =========================================================
   CALCULAR PERÍODO
   ========================================================= */

function calcularPeriodo(
    ano,
    mes
) {

    const aulasPeriodo =
        aulas.filter(
            aula => {

                if (!aula.data) {
                    return false;
                }


                const partes =
                    aula.data.split("-");


                const anoAula =
                    Number(
                        partes[0]
                    );


                const mesAula =
                    Number(
                        partes[1]
                    ) - 1;


                return (
                    anoAula === ano &&
                    mesAula === mes
                );

            }
        );


    let presencas = 0;

    let ausentes = 0;

    let visitantes = 0;

    let ofertas = 0;


    aulasPeriodo.forEach(
        aula => {

            aula.presencas.forEach(
                registro => {

                    if (
                        registro.status ===
                        "presente"
                    ) {

                        presencas++;

                    } else {

                        ausentes++;

                    }

                }
            );


            visitantes +=
                Number(
                    aula.visitantes || 0
                );


            ofertas +=
                Number(
                    aula.oferta || 0
                );

        }
    );


    const totalPossivel =
        classes.reduce(
            (
                total,
                classe
            ) => {

                const aulasDaClasse =
                    aulasPeriodo.filter(
                        aula =>
                            String(
                                aula.classeId
                            ) ===
                            String(
                                classe.id
                            )
                    ).length;


                return (
                    total +
                    (
                        classe.alunos.length *
                        aulasDaClasse
                    )
                );

            },
            0
        );


    const frequencia =
        totalPossivel > 0
            ? (
                presencas /
                totalPossivel
            ) * 100
            : 0;


    const alunos =
        classes.reduce(
            (
                total,
                classe
            ) =>
                total +
                classe.alunos.length,
            0
        );


    const professores =
        classes.reduce(
            (
                total,
                classe
            ) =>
                total +
                classe.alunos.filter(
                    aluno =>
                        aluno.ehProfessor ===
                        true
                ).length,
            0
        );


    return {

        classes:
            classes.length,

        alunos,

        professores,

        aulas:
            aulasPeriodo.length,

        presencas,

        ausentes,

        visitantes,

        ofertas,

        frequencia

    };

}


/* =========================================================
   TENDÊNCIA
   ========================================================= */

function mostrarTendencia(
    elementoId,
    atual,
    anterior
) {

    const elemento =
        document.getElementById(
            elementoId
        );


    if (!elemento) return;


    elemento.classList.remove(
        "trend-up",
        "trend-down",
        "trend-neutral"
    );


    if (
        anterior === 0 &&
        atual === 0
    ) {

        elemento.textContent =
            "— sem alteração";


        elemento.classList.add(
            "trend-neutral"
        );


        return;

    }


    if (anterior === 0) {

        elemento.textContent =
            "↑ novo";


        elemento.classList.add(
            "trend-up"
        );


        return;

    }


    const diferenca =
        atual -
        anterior;


    const percentual =
        (
            diferenca /
            anterior
        ) * 100;


    if (
        Math.abs(percentual) < 1
    ) {

        elemento.textContent =
            "→ estável";


        elemento.classList.add(
            "trend-neutral"
        );


        return;

    }


    elemento.textContent =
        `${
            percentual > 0
                ? "↑"
                : "↓"
        } ${
            Math.abs(
                percentual
            ).toFixed(1)
        }%`;


    elemento.classList.add(

        percentual > 0
            ? "trend-up"
            : "trend-down"

    );

}


/* =========================================================
   COMPARAÇÃO
   ========================================================= */

function mostrarComparacao(
    atual,
    anterior
) {

    const container =
        document.getElementById(
            "metricasComparacao"
        );


    container.innerHTML = "";


    const metricas = [

        {
            nome: "Alunos",
            atual: atual.alunos,
            anterior:
                anterior.alunos
        },

        {
            nome: "Professores",
            atual:
                atual.professores,
            anterior:
                anterior.professores
        },

        {
            nome: "Aulas",
            atual:
                atual.aulas,
            anterior:
                anterior.aulas
        },

        {
            nome: "Presenças",
            atual:
                atual.presencas,
            anterior:
                anterior.presencas
        },

        {
            nome: "Frequência",
            atual:
                atual.frequencia,
            anterior:
                anterior.frequencia,
            percentual: true
        },

        {
            nome: "Visitantes",
            atual:
                atual.visitantes,
            anterior:
                anterior.visitantes
        },

        {
            nome: "Ofertas",
            atual:
                atual.ofertas,
            anterior:
                anterior.ofertas,
            moeda: true
        }

    ];


    let positivas = 0;

    let negativas = 0;


    metricas.forEach(
        metrica => {

            const resultado =
                calcularVariacao(
                    metrica.atual,
                    metrica.anterior
                );


            if (
                resultado.tipo ===
                "up"
            ) {

                positivas++;

            }


            if (
                resultado.tipo ===
                "down"
            ) {

                negativas++;

            }


            let atualTexto =
                metrica.atual;


            let anteriorTexto =
                metrica.anterior;


            if (metrica.moeda) {

                atualTexto =
                    formatarMoeda(
                        metrica.atual
                    );


                anteriorTexto =
                    formatarMoeda(
                        metrica.anterior
                    );

            }


            else if (
                metrica.percentual
            ) {

                atualTexto =
                    metrica.atual
                        .toFixed(1) +
                    "%";


                anteriorTexto =
                    metrica.anterior
                        .toFixed(1) +
                    "%";

            }


            container.innerHTML += `

                <div class="comparison-item">

                    <div>

                        <div class="comparison-name">

                            ${metrica.nome}

                        </div>

                        <div class="comparison-label">

                            Este mês

                        </div>

                    </div>


                    <div class="comparison-value">

                        ${atualTexto}

                    </div>


                    <div class="comparison-value">

                        ${anteriorTexto}

                    </div>


                    <div
                        class="
                            comparison-change
                            ${
                                resultado.tipo ===
                                "up"
                                    ? "trend-up"
                                    : resultado.tipo ===
                                      "down"
                                        ? "trend-down"
                                        : "trend-neutral"
                            }
                        "
                    >

                        ${resultado.texto}

                    </div>

                </div>

            `;

        }
    );


    const resultadoGeral =
        document.getElementById(
            "resultadoGeral"
        );


    resultadoGeral.classList.remove(
        "resultado-melhor",
        "resultado-pior",
        "resultado-estavel"
    );


    if (
        positivas > negativas
    ) {

        resultadoGeral.textContent =
            "↑ EBD melhorando";


        resultadoGeral.classList.add(
            "resultado-melhor"
        );

    }

    else if (
        negativas > positivas
    ) {

        resultadoGeral.textContent =
            "↓ EBD em queda";


        resultadoGeral.classList.add(
            "resultado-pior"
        );

    }

    else {

        resultadoGeral.textContent =
            "→ EBD estável";


        resultadoGeral.classList.add(
            "resultado-estavel"
        );

    }

}


/* =========================================================
   VARIAÇÃO
   ========================================================= */

function calcularVariacao(
    atual,
    anterior
) {

    if (
        atual === 0 &&
        anterior === 0
    ) {

        return {

            tipo: "neutral",

            texto: "→ 0%"

        };

    }


    if (anterior === 0) {

        return {

            tipo: "up",

            texto: "↑ novo"

        };

    }


    const variacao =
        (
            (atual -
                anterior) /
            anterior
        ) * 100;


    if (
        Math.abs(
            variacao
        ) < 1
    ) {

        return {

            tipo: "neutral",

            texto: "→ estável"

        };

    }


    return {

        tipo:
            variacao > 0
                ? "up"
                : "down",

        texto:
            `${
                variacao > 0
                    ? "↑"
                    : "↓"
            } ${
                Math.abs(
                    variacao
                ).toFixed(1)
            }%`

    };

}


/* =========================================================
   DESEMPENHO POR CLASSE
   ========================================================= */

function mostrarDesempenhoClasses() {

    const container =
        document.getElementById(
            "desempenhoClasses"
        );


    if (!container) return;


    container.innerHTML = "";


    if (classes.length === 0) {

        container.innerHTML = `

            <div class="empty-state">

                Nenhuma classe cadastrada.

            </div>

        `;

        return;

    }


    classes.forEach(
        classe => {

            const atual =
                calcularDadosClassePeriodo(
                    classe.id,
                    0
                );


            const anterior =
                calcularDadosClassePeriodo(
                    classe.id,
                    -1
                );


            const variacao =
                calcularVariacao(
                    atual.frequencia,
                    anterior.frequencia
                );


            container.innerHTML += `

                <div class="performance-class">

                    <div class="performance-class-name">

                        <strong>
                            ${classe.nome}
                        </strong>

                        <span>

                            ${classe.dia}
                            •
                            ${classe.horario}

                        </span>

                    </div>


                    <div class="performance-number">

                        <span>
                            Alunos
                        </span>

                        <strong>
                            ${classe.alunos.length}
                        </strong>

                    </div>


                    <div class="performance-number">

                        <span>
                            Aulas
                        </span>

                        <strong>
                            ${atual.aulas}
                        </strong>

                    </div>


                    <div class="performance-number">

                        <span>
                            Presenças
                        </span>

                        <strong>
                            ${atual.presencas}
                        </strong>

                    </div>


                    <div class="performance-number">

                        <span>
                            Frequência
                        </span>

                        <strong>
                            ${atual.frequencia.toFixed(1)}%
                        </strong>

                    </div>


                    <div
                        class="
                            performance-status
                            ${
                                variacao.tipo ===
                                "up"
                                    ? "performance-up"
                                    : variacao.tipo ===
                                      "down"
                                        ? "performance-down"
                                        : "performance-neutral"
                            }
                        "
                    >

                        ${variacao.texto}

                    </div>

                </div>

            `;

        }
    );

}


/* =========================================================
   DADOS DA CLASSE POR PERÍODO
   ========================================================= */

function calcularDadosClassePeriodo(
    classeId,
    deslocamento
) {

    const periodo =
        obterPeriodoMeses(
            deslocamento
        );


    const aulasClasse =
        aulas.filter(
            aula => {

                if (
                    String(
                        aula.classeId
                    ) !==
                    String(
                        classeId
                    )
                ) {

                    return false;

                }


                if (!aula.data) {

                    return false;

                }


                const partes =
                    aula.data.split("-");


                return (

                    Number(
                        partes[0]
                    ) ===
                    periodo.ano

                    &&

                    Number(
                        partes[1]
                    ) - 1 ===
                    periodo.mes

                );

            }
        );


    let presencas = 0;

    let ausentes = 0;


    aulasClasse.forEach(
        aula => {

            aula.presencas.forEach(
                registro => {

                    if (
                        registro.status ===
                        "presente"
                    ) {

                        presencas++;

                    } else {

                        ausentes++;

                    }

                }
            );

        }
    );


    const classe =
        obterClasse(
            classeId
        );


    const totalPossivel =
        classe
            ? classe.alunos.length *
              aulasClasse.length
            : 0;


    const frequencia =
        totalPossivel > 0
            ? (
                presencas /
                totalPossivel
            ) * 100
            : 0;


    return {

        aulas:
            aulasClasse.length,

        presencas,

        ausentes,

        frequencia

    };

}