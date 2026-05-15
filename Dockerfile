FROM node:24-slim AS base 
ENV CI=true 
RUN npm install -g pnpm@10.28.0 

COPY . /usr/src/app
WORKDIR /usr/src/app 

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install

EXPOSE 3001

CMD ["pnpm", "--filter", "web", "dev", "--host"]

