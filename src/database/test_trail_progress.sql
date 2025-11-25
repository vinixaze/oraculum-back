SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'trail_progress';

SELECT 
    tp.id,
    u.email,
    u.nome,
    tp.completed_lessons,
    array_length(tp.completed_lessons, 1) as total_completed,
    tp.current_module,
    tp.current_lesson,
    tp.updated_at
FROM trail_progress tp
JOIN usuarios u ON tp.usuario_id = u.id
ORDER BY tp.updated_at DESC;

SELECT 
    u.email,
    u.nome,
    u.quiz_completed,
    u.nivel_atual,
    u.pontuacao_final,
    COALESCE(array_length(tp.completed_lessons, 1), 0) as aulas_concluidas,
    4 as total_aulas,
    ROUND((COALESCE(array_length(tp.completed_lessons, 1), 0)::numeric / 4) * 100) as percentual_trilha
FROM usuarios u
LEFT JOIN trail_progress tp ON u.id = tp.usuario_id
WHERE u.tipo = 'usuario'
ORDER BY u.email;

SELECT 
    u.email,
    u.nome,
    u.quiz_completed,
    u.data_criacao
FROM usuarios u
LEFT JOIN trail_progress tp ON u.id = tp.usuario_id
WHERE u.tipo = 'usuario' 
AND tp.id IS NULL;

SELECT 
    COUNT(DISTINCT u.id) as total_usuarios,
    COUNT(DISTINCT CASE WHEN tp.id IS NOT NULL THEN u.id END) as usuarios_com_progresso,
    COUNT(DISTINCT CASE WHEN array_length(tp.completed_lessons, 1) > 0 THEN u.id END) as usuarios_com_aulas_concluidas
FROM usuarios u
LEFT JOIN trail_progress tp ON u.id = tp.usuario_id
WHERE u.tipo = 'usuario';

--  Limpar progressos de teste
-- DELETE FROM trail_progress WHERE email = 'email@teste.com';