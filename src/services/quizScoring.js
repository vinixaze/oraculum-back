class QuizScoringService {
  constructor() {
        this.MODOS = {
      FACIL: { pesoIniciante: 1, pesoExpert: 3, nome: 'Fácil' },
      MEDIO: { pesoIniciante: 2, pesoExpert: 5, nome: 'Médio' },
      DIFICIL: { pesoIniciante: 3, pesoExpert: 7, nome: 'Difícil' }
    };

    this.LIMITE_PONTOS = 30;
    this.LIMITE_PERGUNTAS = 12;
    this.ACERTOS_PARA_SUBIR = 2;
  }

  iniciarQuiz(modo = 'MEDIO') {
    const config = this.MODOS[modo] || this.MODOS.MEDIO;
    
    return {
      modo: config.nome,
      pesoIniciante: config.pesoIniciante,
      pesoExpert: config.pesoExpert,
      pontuacao: 0,
      totalPerguntas: 0,
      acertosSeguidosIniciante: 0,
      nivel: 'INICIANTE',
      historico: [],
      finalizado: false
    };
  }

  /**
   * @param {Object} sessao - Sessão atual do quiz
   * @param {Number} questaoId - ID da questão
   * @param {Boolean} respostaCorreta - Se o usuário acertou
   * @param {String} dificuldadeQuestao - 'INICIANTE' ou 'EXPERT'
   * @returns {Object} - Sessão atualizada
   */
  processarResposta(sessao, questaoId, respostaCorreta, dificuldadeQuestao) {
    if (this.quizFinalizado(sessao)) {
      return {
        ...sessao,
        mensagem: 'Quiz já finalizado'
      };
    }

    sessao.totalPerguntas++;
    
    let acertou = respostaCorreta;
    let pontosGanhos = 0;
    let mudouNivel = false;
    let mensagem = '';
  
    if (sessao.nivel === 'INICIANTE') {
      if (acertou && dificuldadeQuestao === 'INICIANTE') {
        pontosGanhos = sessao.pesoIniciante;
        sessao.acertosSeguidosIniciante++;

        if (sessao.acertosSeguidosIniciante === this.ACERTOS_PARA_SUBIR) {
          sessao.nivel = 'EXPERT';
          sessao.acertosSeguidosIniciante = 0;
          mudouNivel = true;
          mensagem = '⬆️ Subiu para o nível EXPERT!';
        }
      } else if (!acertou) {
        sessao.acertosSeguidosIniciante = 0;
      }
      
    } else if (sessao.nivel === 'EXPERT') {
      if (acertou && dificuldadeQuestao === 'EXPERT') {
        pontosGanhos = sessao.pesoExpert;
      } else if (!acertou) {
        sessao.nivel = 'INICIANTE';
        mudouNivel = true;
        mensagem = '⬇️ Voltou para o nível INICIANTE!';
      }
    }

    if (acertou) {
      sessao.pontuacao += pontosGanhos;
    }

    sessao.historico.push({
      pergunta: sessao.totalPerguntas,
      questaoId,
      acertou,
      pontosGanhos,
      nivelAtual: sessao.nivel,
      mudouNivel,
      pontuacaoTotal: sessao.pontuacao
    });

    if (this.quizFinalizado(sessao)) {
      sessao.finalizado = true;
      
      if (sessao.pontuacao >= this.LIMITE_PONTOS) {
        mensagem += ' 🏆 Parabéns! Você atingiu a pontuação máxima!';
      } else {
        mensagem += ' Fim das 12 perguntas.';
      }
    }

    return {
      ...sessao,
      ultimaResposta: {
        acertou,
        pontosGanhos,
        mudouNivel,
        mensagem
      }
    };
  }

  quizFinalizado(sessao) {
    return sessao.pontuacao >= this.LIMITE_PONTOS || 
           sessao.totalPerguntas >= this.LIMITE_PERGUNTAS;
  }

  calcularNivelFinal(pontuacao) {
    if (pontuacao >= 25) return 'AVANÇADO';
    if (pontuacao >= 15) return 'INTERMEDIÁRIO';
    return 'INICIANTE';
  }

  gerarRelatorio(sessao) {
    const nivelFinal = this.calcularNivelFinal(sessao.pontuacao);
    const percentualConclusao = Math.round((sessao.pontuacao / this.LIMITE_PONTOS) * 100);
    const acertos = sessao.historico.filter(h => h.acertou).length;
    const erros = sessao.totalPerguntas - acertos;

    return {
      pontuacaoFinal: sessao.pontuacao,
      nivelFinal,
      totalPerguntas: sessao.totalPerguntas,
      acertos,
      erros,
      percentualConclusao,
      modo: sessao.modo,
      atingiuMaximo: sessao.pontuacao >= this.LIMITE_PONTOS,
      historico: sessao.historico
    };
  }
}

module.exports = new QuizScoringService();