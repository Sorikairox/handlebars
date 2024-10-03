import HandlebarsJS from "handlebars";
import { walk } from "@std/fs";
import {
  globToRegExp,
  join,
  normalize,
} from "@std/path";
const { readFile } = Deno;

export { HandlebarsJS };

/**
 * Configuration options for Handlebars.
 *
 * @interface HandlebarsConfig
 * @property {string} baseDir - The base directory for templates.
 * @property {string} extname - The file extension for templates.
 * @property {string} layoutsDir - The directory for layout templates.
 * @property {string} partialsDir - The directory for partial templates.
 * @property {boolean} [cachePartials] - Whether to cache partial templates.
 * @property {string} defaultLayout - The default layout template.
 * @property {any} helpers - An object containing helper functions.
 * @property {any} compilerOptions - Options for the Handlebars compiler.
 */
export interface HandlebarsConfig {
  baseDir: string;
  extname: string;
  layoutsDir: string;
  partialsDir: string;
  cachePartials?: boolean;
  defaultLayout: string;
  // deno-lint-ignore no-explicit-any
  helpers: any;
  // deno-lint-ignore no-explicit-any
  compilerOptions: any;
}

const DEFAULT_HANDLEBARS_CONFIG: HandlebarsConfig = {
  baseDir: "views",
  extname: ".hbs",
  layoutsDir: "layouts/",
  partialsDir: "partials/",
  cachePartials: true,
  defaultLayout: "main",
  helpers: undefined,
  compilerOptions: undefined,
};

function getNormalizePath(path: string) {
  return normalize(path).replace(/\\/g, "/");
}

/**
 * Provides methods to render views and manage partials using Handlebars templates.
 * 
 * @remarks
 * This class is designed to work with the Handlebars templating engine and provides functionality to register helpers, render views with or without layouts, and manage partials.
 * 
 * @example
 * ```typescript
 * const handlebars = new Handlebars();
 * const renderedView = await handlebars.renderView('index', { title: 'Home' });
 * console.log(renderedView);
 * ```
 * 
 * @public
 */
export class Handlebars {
  #havePartialsBeenRegistered = false;

  /**
   * Creates an instance of the class with the provided configuration.
   * Merges the provided configuration with the default configuration.
   * Registers any helpers specified in the configuration with Handlebars.
   *
   * @param config - The configuration object for Handlebars. Defaults to `DEFAULT_HANDLEBARS_CONFIG`.
   */
  constructor(private config: HandlebarsConfig = DEFAULT_HANDLEBARS_CONFIG) {
    this.config = { ...DEFAULT_HANDLEBARS_CONFIG, ...config };

    if (this.config.helpers) {
      const helperKeys = Object.keys(this.config.helpers);

      for (let i = 0; i < helperKeys.length; i++) {
        const helperKey = helperKeys[i];
        // deno-lint-ignore no-explicit-any
        (HandlebarsJS as any).registerHelper(
          helperKey,
          this.config.helpers[helperKey],
        );
      }
    }
  }

  /**
     * Renders a view with an optional layout.
     * 
     * @param {string} view - The name of the view to render.
     * @param {Record<string, unknown>} [context] - The data to pass to the view.
     * @param {string} [layout] - The name of the layout to use.
     * @returns {Promise<string>} The rendered view.
     */
  public async renderView(
    view: string,
    context?: Record<string, unknown>,
    layout?: string,
  ): Promise<string> {
    if (!view) {
      console.warn("View is null");
      return "";
    }

    const config: HandlebarsConfig = this.config as HandlebarsConfig;

    if (!config.cachePartials || !this.#havePartialsBeenRegistered) {
      await this.registerPartials();
    }

    const path = join(config.baseDir, view + config.extname);
    const body: string = await this.render(path, context);

    layout = (layout as string) || config.defaultLayout;

    if (layout) {
      const layoutPath: string = join(
        config.baseDir,
        config.layoutsDir,
        layout + config.extname,
      );

      return this.render(layoutPath, { ...context, body });
    }

    return body;
  }

  /**
     * Renders a partial template.
     * 
     * @param {string} partial - The name of the partial template.
     * @param {Record<string, unknown>} [context] - The data to pass to the partial template.
     * @returns {Promise<string>} The rendered partial template.
     */
  public async render(
    path: string,
    context?: Record<string, unknown>,
  ): Promise<string> {
    // TODO: use cashe
    const source: string = new TextDecoder().decode(await readFile(path));
    // deno-lint-ignore no-explicit-any
    const template = (HandlebarsJS as any).compile(
      source,
      this.config!.compilerOptions,
    );

    return template(context);
  }

  private async registerPartials() {
    const paths = await this.getTemplatesPath(
      join(this.config.baseDir, this.config.partialsDir),
    );
    if (paths) {
      for (const path of paths) {
        const templateName: string = path
          .replace(
            getNormalizePath(this.config.baseDir) + "/" +
              this.config!.partialsDir,
            "",
          )
          .replace(new RegExp(this.config!.extname + "$"), "");
        const source: string = new TextDecoder().decode(await readFile(path));

        // deno-lint-ignore no-explicit-any
        (HandlebarsJS as any).registerPartial(templateName, source);
      }
    }

    this.#havePartialsBeenRegistered = true;
  }

  private async getTemplatesPath(path: string): Promise<string[]> {
    const arr: string[] = [];

    for await (
      const w of walk(
        path,
        { match: [globToRegExp("**/*" + this.config!.extname)] },
      )
    ) {
      if (w.isFile) {
        arr.push(getNormalizePath(w.path));
      }
    }

    return arr;
  }
}
