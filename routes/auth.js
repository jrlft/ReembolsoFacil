const express = require('express');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const emailService = require('../utils/emailService');
const router = express.Router();

// Registro de usuário
router.post('/register', async (req, res) => {
  try {
    const { email, password, nome } = req.body;

    if (!email || !password || !nome) {
      return res.status(400).json({ error: 'Email, senha e nome são obrigatórios' });
    }

    // Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Criar perfil do usuário
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('usuarios')
      .insert([
        {
          id: authData.user.id,
          email,
          nome,
          is_admin: false,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (profileError) {
      // Se falhar ao criar perfil, deletar usuário do auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(400).json({ error: 'Erro ao criar perfil do usuário' });
    }

    // Enviar email de confirmação
    const { error: emailError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email,
      options: {
        redirectTo: `${process.env.FRONTEND_URL}/auth/confirm`
      }
    });

    if (emailError) {
      console.error('Erro ao enviar email de confirmação:', emailError);
    }

    // Agendar remoção do usuário se não confirmar em 15 minutos
    setTimeout(async () => {
      try {
        const { data: user } = await supabaseAdmin.auth.admin.getUserById(authData.user.id);
        if (user && !user.email_confirmed_at) {
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          await supabaseAdmin.from('usuarios').delete().eq('id', authData.user.id);
        }
      } catch (error) {
        console.error('Erro ao limpar usuário não confirmado:', error);
      }
    }, 15 * 60 * 1000); // 15 minutos

    res.status(201).json({
      message: 'Usuário criado com sucesso. Verifique seu email para confirmar a conta.',
      user: {
        id: profile.id,
        email: profile.email,
        nome: profile.nome
      }
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Buscar dados do perfil
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      return res.status(400).json({ error: 'Erro ao buscar perfil do usuário' });
    }

    res.json({
      user: {
        id: profile.id,
        email: profile.email,
        nome: profile.nome,
        is_admin: profile.is_admin
      },
      session: data.session
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('Erro no logout:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Confirmar email
router.post('/confirm', async (req, res) => {
  try {
    const { token, type } = req.body;

    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type || 'signup'
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Email confirmado com sucesso', user: data.user });
  } catch (error) {
    console.error('Erro na confirmação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Recuperar senha
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/auth/reset-password`
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Email de recuperação enviado' });
  } catch (error) {
    console.error('Erro na recuperação de senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Redefinir senha
router.post('/reset-password', async (req, res) => {
  try {
    const { password, access_token, refresh_token } = req.body;

    if (!password || !access_token) {
      return res.status(400).json({ error: 'Senha e token são obrigatórios' });
    }

    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password
    });

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    res.json({ message: 'Senha redefinida com sucesso' });
  } catch (error) {
    console.error('Erro na redefinição de senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Verificar sessão
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) {
      return res.status(400).json({ error: 'Erro ao buscar perfil do usuário' });
    }

    res.json({
      user: {
        id: profile.id,
        email: profile.email,
        nome: profile.nome,
        is_admin: profile.is_admin
      }
    });
  } catch (error) {
    console.error('Erro ao verificar sessão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;