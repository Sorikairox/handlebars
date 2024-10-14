## Handlebars template render for Deno

![test](https://github.com/alosaur/handlebars/workflows/test/badge.svg)

Official handlebars docs: [Guide](https://handlebarsjs.com/guide)

### How to use renderer

```ts
import { Handlebars, HandlebarsConfig } from "jsr:@danet/handlebars";

// First, create instance of Handlebars

const handle = new Handlebars();

// or with custom config
const handle = new Handlebars({
    ...
});

// by default uses this config:
const DEFAULT_HANDLEBARS_CONFIG: HandlebarsConfig = {
    baseDir: 'views',
    extname: '.hbs',
    layoutsDir: 'layouts/',
    partialsDir: 'partials/',
    cachePartials: true,
    defaultLayout: 'main',
    helpers: undefined,
    compilerOptions: undefined,
};

// then render page
import { Application, Router } from 'jsr:@oak/oak';
const app = new Application();
const router = new Router();
app.use(async function(ctx, next) {
    ctx.state.handlebars = new Handlebars();
    await next();
});
router.get('/', async function(ctx) {
    ctx.response.body = await ctx.state.handlebars.renderView('index', { name: 'Alosaur' });
);
```

#### Rendering in development mode

By default partials are registered (and so cached) the first time you call
`renderView`. However, in development, it may be better to re-register them
every time you render a view so that the rendering reflects the latest changes
you have made to your partials.

You can ensure this happens by setting `cachePartials` to be false in your
configuration.
