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

## Instruction for RStudio
1. If you need to inspect the source for the JPSurv R package, extract the `docker/JPSurv_2.0.31.tar.gz` file (in the docker directory, run `tar -xvf JPSurv_2.0.31.tar.gz`)
2. Open JPSurvWrapper.R (if RStudio has the proper file associations, you can just click on the file)
3. Source File (click source button) to run all the functions contained in the file.
4. You cannot debug the R code from your browser. You must change the code, then restart the docker container (see above) to see your changes.


## External Technologies Used
- ggplot2
- Python Flask
- rjson
- R
- R Studio

## Internal Technologies Used
- jpsurv R package
