import { copyFileSync, mkdirSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

const defaultFilter = file => file.endsWith('.json');

const normalizeDestinations = destinations => {
  if (!Array.isArray(destinations)) {
    return [destinations];
  }

  return destinations;
};

const createFilter = filter => {
  if (!filter) {
    return defaultFilter;
  }

  if (filter instanceof RegExp) {
    return file => filter.test(file);
  }

  if (typeof filter === 'function') {
    return filter;
  }

  throw new TypeError('filter must be a RegExp or function if provided');
};

export function copyArtifacts(tasks, options = {}) {
  const { cwd = process.cwd(), onCopy } = options;
  const absoluteCwd = resolve(cwd);

  const summary = {
    totalTasks: 0,
    totalArtifacts: 0,
    totalCopies: 0,
    taskResults: [],
    warnings: [],
    errors: []
  };

  for (const taskDef of tasks) {
    summary.totalTasks += 1;

    const {
      id = `task-${summary.totalTasks}`,
      label = id,
      source,
      destinations,
      filter
    } = taskDef;

    const filterFn = createFilter(filter);
    const sourcePath = resolve(absoluteCwd, source);
    const destinationList = normalizeDestinations(destinations).map(dest => ({
      original: dest,
      absolute: resolve(absoluteCwd, dest)
    }));

    const taskResult = {
      id,
      label,
      source: sourcePath,
      destinations: destinationList.map(dest => dest.absolute),
      copied: [],
      warnings: [],
      errors: []
    };

    summary.taskResults.push(taskResult);

    let files;

    try {
      files = readdirSync(sourcePath);
    } catch (error) {
      const message = `Failed to read source directory '${sourcePath}': ${error.message}`;
      taskResult.errors.push(message);
      summary.errors.push({ taskId: id, message, error });
      continue;
    }

    const matchingFiles = files.filter(filterFn);

    if (matchingFiles.length === 0) {
      const warning = `No artifacts matching the provided filter in '${sourcePath}'`;
      taskResult.warnings.push(warning);
      summary.warnings.push({ taskId: id, message: warning });
      continue;
    }

    summary.totalArtifacts += matchingFiles.length;

    for (const destination of destinationList) {
      try {
        mkdirSync(destination.absolute, { recursive: true });
      } catch (error) {
        const message = `Failed to ensure destination '${destination.absolute}': ${error.message}`;
        taskResult.errors.push(message);
        summary.errors.push({ taskId: id, message, error });
        continue;
      }

      for (const file of matchingFiles) {
        const sourceFile = join(sourcePath, file);
        const destinationFile = join(destination.absolute, file);

        try {
          copyFileSync(sourceFile, destinationFile);
        } catch (error) {
          const message = `Failed to copy '${sourceFile}' to '${destinationFile}': ${error.message}`;
          taskResult.errors.push(message);
          summary.errors.push({ taskId: id, message, error });
          continue;
        }

        summary.totalCopies += 1;
        taskResult.copied.push({ file, destination: destinationFile });

        if (typeof onCopy === 'function') {
          onCopy({
            taskId: id,
            label,
            file,
            sourceFile,
            destinationFile
          });
        }
      }
    }
  }

  return summary;
}

