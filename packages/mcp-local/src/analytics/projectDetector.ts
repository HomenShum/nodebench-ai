/**
 * Project Type Detection
 * 
 * Analyzes the current working directory to determine project type,
 * language, framework, and characteristics.
 */

import fs from 'fs';
import path from 'path';

export type ProjectType =
  | 'web_frontend'
  | 'web_backend'
  | 'fullstack'
  | 'mobile'
  | 'desktop'
  | 'cli'
  | 'library'
  | 'data_science'
  | 'devops'
  | 'unknown';

export interface ProjectContext {
  projectPath: string;
  projectType: ProjectType;
  language: string;
  framework?: string;
  hasTests: boolean;
  hasCI: boolean;
  hasDocs: boolean;
  fileCount: number;
}

const FRAMEWORK_PATTERNS: Record<string, { files: string[]; type: ProjectType }> = {
  'react': {
    files: ['package.json', 'src/App.jsx', 'src/App.tsx', 'public/index.html'],
    type: 'web_frontend'
  },
  'nextjs': {
    files: ['next.config.js', 'pages/_app.js', 'app/layout.tsx'],
    type: 'fullstack'
  },
  'vue': {
    files: ['vue.config.js', 'src/App.vue', 'public/index.html'],
    type: 'web_frontend'
  },
  'angular': {
    files: ['angular.json', 'src/main.ts', 'src/app/app.component.ts'],
    type: 'web_frontend'
  },
  'svelte': {
    files: ['svelte.config.js', 'src/App.svelte'],
    type: 'web_frontend'
  },
  'express': {
    files: ['package.json', 'server.js', 'app.js'],
    type: 'web_backend'
  },
  'fastapi': {
    files: ['main.py', 'requirements.txt', 'app.py'],
    type: 'web_backend'
  },
  'django': {
    files: ['manage.py', 'settings.py', 'wsgi.py'],
    type: 'web_backend'
  },
  'flask': {
    files: ['app.py', 'requirements.txt', 'wsgi.py'],
    type: 'web_backend'
  },
  'spring': {
    files: ['pom.xml', 'build.gradle', 'src/main/java'],
    type: 'web_backend'
  },
  'rails': {
    files: ['Gemfile', 'config/application.rb', 'app/controllers'],
    type: 'web_backend'
  },
  'electron': {
    files: ['package.json', 'main.js', 'electron-builder.yml'],
    type: 'desktop'
  },
  'tauri': {
    files: ['src-tauri/Cargo.toml', 'tauri.conf.json'],
    type: 'desktop'
  },
  'react_native': {
    files: ['package.json', 'App.tsx', 'ios/Podfile', 'android/build.gradle'],
    type: 'mobile'
  },
  'flutter': {
    files: ['pubspec.yaml', 'lib/main.dart'],
    type: 'mobile'
  },
  'swiftui': {
    files: ['Package.swift', 'ContentView.swift'],
    type: 'mobile'
  },
  'python_library': {
    files: ['setup.py', 'pyproject.toml', 'src/__init__.py'],
    type: 'library'
  },
  'npm_library': {
    files: ['package.json', 'src/index.ts', 'tsconfig.json'],
    type: 'library'
  },
  'rust_library': {
    files: ['Cargo.toml', 'src/lib.rs'],
    type: 'library'
  },
  'jupyter': {
    files: ['*.ipynb', 'requirements.txt', 'environment.yml'],
    type: 'data_science'
  },
  'terraform': {
    files: ['*.tf', 'terraform.tfstate', 'main.tf'],
    type: 'devops'
  },
  'kubernetes': {
    files: ['*.yaml', 'k8s/', 'deployment.yaml'],
    type: 'devops'
  },
  'docker': {
    files: ['Dockerfile', 'docker-compose.yml'],
    type: 'devops'
  },
};

const LANGUAGE_PATTERNS: Record<string, string[]> = {
  'typescript': ['*.ts', '*.tsx', 'tsconfig.json'],
  'javascript': ['*.js', '*.jsx', 'package.json'],
  'python': ['*.py', 'requirements.txt', 'pyproject.toml', 'setup.py'],
  'java': ['*.java', 'pom.xml', 'build.gradle'],
  'kotlin': ['*.kt', 'build.gradle.kts'],
  'go': ['*.go', 'go.mod'],
  'rust': ['*.rs', 'Cargo.toml'],
  'csharp': ['*.cs', '*.csproj'],
  'cpp': ['*.cpp', '*.h', 'CMakeLists.txt', 'Makefile'],
  'ruby': ['*.rb', 'Gemfile'],
  'php': ['*.php', 'composer.json'],
  'swift': ['*.swift', 'Package.swift'],
  'shell': ['*.sh', 'Makefile'],
};

const CI_PATTERNS = [
  '.github/workflows/*.yml',
  '.github/workflows/*.yaml',
  '.gitlab-ci.yml',
  'Jenkinsfile',
  '.travis.yml',
  'circleci/config.yml',
  'azure-pipelines.yml',
  'bitbucket-pipelines.yml',
];

const DOC_PATTERNS = [
  'README.md',
  'docs/',
  'doc/',
  '*.md',
  'CONTRIBUTING.md',
  'CHANGELOG.md',
];

const TEST_PATTERNS = [
  '**/*.test.ts',
  '**/*.test.js',
  '**/*.spec.ts',
  '**/*.spec.js',
  '**/*_test.py',
  '**/test_*.py',
  '**/__tests__/**',
  'tests/',
  'test/',
];

function fileExists(dir: string, pattern: string): boolean {
  const fullPath = path.join(dir, pattern);
  if (pattern.includes('*')) {
    const parts = pattern.split('/');
    const baseDir = parts.slice(0, -1).join('/');
    const glob = parts[parts.length - 1];
    const searchDir = baseDir ? path.join(dir, baseDir) : dir;
    
    if (!fs.existsSync(searchDir)) return false;
    
    try {
      const files = fs.readdirSync(searchDir);
      const regex = new RegExp('^' + glob.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
      return files.some(f => regex.test(f));
    } catch {
      return false;
    }
  }
  return fs.existsSync(fullPath);
}

function anyFileExists(dir: string, patterns: string[]): boolean {
  return patterns.some(p => fileExists(dir, p));
}

function countFiles(dir: string, maxDepth: number = 3): number {
  let count = 0;
  
  function walk(currentDir: string, depth: number) {
    if (depth > maxDepth) return;
    
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          // Skip node_modules, .git, etc.
          if (!['node_modules', '.git', '.next', 'dist', 'build', 'target'].includes(entry.name)) {
            walk(path.join(currentDir, entry.name), depth + 1);
          }
        } else {
          count++;
        }
      }
    } catch {
      // Ignore permission errors
    }
  }
  
  walk(dir, 0);
  return count;
}

function detectLanguage(dir: string): string {
  for (const [lang, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
    if (anyFileExists(dir, patterns)) {
      return lang;
    }
  }
  return 'unknown';
}

function detectFramework(dir: string): { framework: string | undefined; type: ProjectType } {
  for (const [framework, config] of Object.entries(FRAMEWORK_PATTERNS)) {
    if (anyFileExists(dir, config.files)) {
      return { framework, type: config.type };
    }
  }
  return { framework: undefined, type: 'unknown' };
}

export function detectProject(projectPath: string = process.cwd()): ProjectContext {
  const { framework, type: detectedType } = detectFramework(projectPath);
  const language = detectLanguage(projectPath);
  
  // Determine project type based on framework or language
  let projectType: ProjectType = detectedType;
  
  if (projectType === 'unknown') {
    // Fallback: infer from language
    if (['typescript', 'javascript'].includes(language)) {
      projectType = 'web_frontend';
    } else if (['python', 'java', 'go'].includes(language)) {
      projectType = 'web_backend';
    } else if (['rust', 'csharp', 'cpp'].includes(language)) {
      projectType = 'library';
    }
  }
  
  const hasTests = anyFileExists(projectPath, TEST_PATTERNS);
  const hasCI = anyFileExists(projectPath, CI_PATTERNS);
  const hasDocs = anyFileExists(projectPath, DOC_PATTERNS);
  const fileCount = countFiles(projectPath);
  
  return {
    projectPath,
    projectType,
    language,
    framework,
    hasTests,
    hasCI,
    hasDocs,
    fileCount,
  };
}

export function getProjectTypeDescription(type: ProjectType): string {
  const descriptions: Record<ProjectType, string> = {
    web_frontend: 'Web frontend application (React, Vue, Angular, etc.)',
    web_backend: 'Web backend API or service',
    fullstack: 'Full-stack web application (Next.js, etc.)',
    mobile: 'Mobile application (React Native, Flutter, etc.)',
    desktop: 'Desktop application (Electron, Tauri, etc.)',
    cli: 'Command-line interface tool',
    library: 'Reusable library or package',
    data_science: 'Data science or ML project (Jupyter, etc.)',
    devops: 'DevOps or infrastructure project (Terraform, Docker, etc.)',
    unknown: 'Unknown project type',
  };
  return descriptions[type];
}
