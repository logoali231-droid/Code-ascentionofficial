FROM node:20-bookworm

# Evita que instaladores travem o terminal com prompts interativos
ENV DEBIAN_FRONTEND=noninteractive

# 1. Atualização e instalação de todas as ferramentas nativas mapeadas no seu tipo SupportedLanguage
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    build-essential \
    gcc \
    g++ \
    gfortran \
    python3 \
    python3-pip \
    openjdk-17-jdk \
    golang-go \
    rustc \
    cargo \
    php-cli \
    ruby-full \
    perl \
    lua5.4 \
    tcl \
    nasm \
    fpc \
    gnucobol \
    clojure \
    swi-prolog \
    sbcl \
    r-base \
    julia \
    elixir \
    erlang \
    ghc \
    sqlite3 \
    curl \
    git \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# 2. Instalação oficial do ecossistema .NET 8 (Garante C#, F# e VB.NET nativos)
RUN apt-get update && apt-get install -y --no-install-recommends \
    dotnet-sdk-8.0 \
    && rm -rf /var/lib/apt/lists/*

# 3. Gerenciadores Globais via NPM (TypeScript para a aba principal, CoffeeScript, Solidity Compiler)
RUN npm install -g typescript coffeescript solc

# 4. Links simbólicos para blindar as chamadas exatas feitas pelo seu meta.js
RUN ln -sf /usr/bin/lua5.4 /usr/bin/lua && \
    ln -sf /usr/bin/python3 /usr/bin/python

# 5. Instalação manual isolada do compilador Kotlin (Kotlinc) para suportar "kotlin" remoto
RUN curl -sSL "https://github.com/JetBrains/kotlin/releases/download/v1.9.23/kotlin-compiler-1.9.23.zip" -o /tmp/kotlin.zip && \
    unzip /tmp/kotlin.zip -d /opt && \
    ln -s /opt/kotlinc/bin/kotlinc /usr/local/bin/kotlinc && \
    rm -rf /tmp/kotlin.zip

# 6. Criação do ambiente de execução do servidor Node.js
WORKDIR /app

# 7. Copia o package do servidor de runtime e instala apenas dependências de produção
COPY package*.json ./
RUN npm install --only=production

# 8. Copia o restante da árvore de arquivos do seu backend
COPY . .

# 9. Configurações de ambiente para travar telemetrias de terceiros e otimizar a performance
ENV DOTNET_CLI_TELEMETRY_OPTOUT=1
ENV HOME=/tmp

# 10. Expõe a porta do gateway WebSocket configurada no seu server.js
EXPOSE 4000

# Dispara a sandbox monolítica na nuvem da Azure
CMD ["node", "server.js"]
