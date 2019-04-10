# nci-webtools-dccps-seer

## Getting Started
After cloning this repository, build the jpsurv development image (`cbiitss/jpsurv:dev`):

```bash
npm run build:image
```

To start the development server on Linux/macOS, use:

```bash
npm run start:dev
```

To start the development server on Windows, run the following in a non-powershell command prompt:

```bash
npm run start:msdev
```

After starting the container, JPSurv should be available at: [http://localhost:9000/jpsurv](http://localhost:9000/jpsurv).


## Relevant Docker Commands

- docker ps
    - To find the running container
- docker logs -f CONTAINER
    - Shows the log output
- docker restart CONTAINER
    - Restart the container.
    - WARNING!!! Always restart after making a change to the R and Python code.

## External Technologies Used
- ggplot2
- Python Flask
- rjson
- R
- R Studio

## Internal Technologies Used
- jpsurv R package
