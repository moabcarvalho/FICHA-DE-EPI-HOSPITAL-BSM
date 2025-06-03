# Instruções para Deploy do Site HOSPITAL BOM SAMARITANO MARINGÁ – FICHA DE ENTREGA DE EPI

Este documento contém instruções detalhadas para fazer o deploy do site na plataforma Vercel.

## Arquivos Incluídos

O projeto está organizado na seguinte estrutura:
- `src/` - Código-fonte do aplicativo Flask
  - `models/` - Modelos de banco de dados (colaborador, epi, registro)
  - `routes/` - Rotas da API (colaborador, epi, registro)
  - `static/` - Arquivos estáticos (HTML, CSS, JavaScript)
  - `main.py` - Ponto de entrada do aplicativo Flask
- `requirements.txt` - Dependências Python necessárias
- `vercel.json` - Configuração para deploy na Vercel

## Passo a Passo para Deploy na Vercel

### 1. Criar uma Conta na Vercel (se ainda não tiver)

1. Acesse [vercel.com](https://vercel.com)
2. Clique em "Sign Up" e crie uma conta usando GitHub, GitLab, Bitbucket ou e-mail

### 2. Preparar o Repositório no GitHub

1. Crie um novo repositório no GitHub
   - Acesse [github.com](https://github.com) e faça login
   - Clique no botão "+" no canto superior direito e selecione "New repository"
   - Dê um nome ao repositório (ex: "epi-hospital-app")
   - Escolha a visibilidade (público ou privado)
   - Clique em "Create repository"

2. Faça upload dos arquivos do projeto
   - Clique em "uploading an existing file"
   - Arraste todos os arquivos e pastas do projeto para a área de upload
   - Clique em "Commit changes"

### 3. Deploy na Vercel

1. Acesse o dashboard da Vercel
   - Faça login em [vercel.com](https://vercel.com)
   - Vá para o dashboard

2. Importe o projeto
   - Clique em "Add New" > "Project"
   - Conecte sua conta GitHub se ainda não estiver conectada
   - Selecione o repositório que você criou

3. Configure o projeto
   - A Vercel deve detectar automaticamente que é um projeto Python/Flask
   - Mantenha as configurações padrão
   - Clique em "Deploy"

4. Aguarde o deploy
   - A Vercel iniciará o processo de build e deploy
   - Isso pode levar alguns minutos

5. Acesse o site
   - Após o deploy bem-sucedido, a Vercel fornecerá uma URL para o seu site
   - Clique na URL para acessar o site

### 4. Configurações Adicionais (Opcional)

1. Domínio personalizado
   - No dashboard da Vercel, vá para as configurações do projeto
   - Clique em "Domains"
   - Adicione seu domínio personalizado e siga as instruções

2. Variáveis de ambiente
   - Se necessário, você pode adicionar variáveis de ambiente nas configurações do projeto

## Solução de Problemas Comuns

1. **Erro de build**
   - Verifique os logs de build na Vercel para identificar o problema
   - Certifique-se de que todas as dependências estão listadas no `requirements.txt`

2. **Erro de banco de dados**
   - O SQLite funciona na Vercel, mas os dados podem ser perdidos em novos deploys
   - Para dados persistentes, considere migrar para um banco de dados hospedado como PostgreSQL

3. **Erro 404 em rotas**
   - Verifique se o arquivo `vercel.json` está configurado corretamente
   - Certifique-se de que as rotas no frontend apontam para os endpoints corretos

## Manutenção e Atualizações

Para atualizar o site após o deploy inicial:

1. Faça as alterações necessárias nos arquivos
2. Faça commit e push das alterações para o repositório GitHub
3. A Vercel detectará automaticamente as alterações e fará um novo deploy

## Suporte

Se precisar de ajuda adicional, consulte a [documentação da Vercel](https://vercel.com/docs) ou entre em contato com o desenvolvedor do projeto.
