function minMaxArray(arr) {
	let max = -Number.MAX_VALUE,
		min = Number.MAX_VALUE
	arr.forEach(function(e) {
		if (max < e) {
			max = e
		}
		if (min > e) {
			min = e
		}
	})
	return [min, max]
}

class VTKLoader {
	constructor(data) {
		return this.parseVTK(data)
	}

	parseVTK(data) {
		const line = data.split('\n').map(x => x.trim())
		const dataObj = { positions: [], indices: [], pointDatas: [] }

		for (let i = 0; i < line.length; i++) {
			if (
				line[i]
					.split(/\s+/)[0]
					.toLowerCase()
					.match(/^points/)
			) {
				const numberOfPoints = parseInt(line[i].split(/\s+/)[1])
				i = 1 + i

				for (let k = 0; k < numberOfPoints; k++) {
					const vertices = line[i + k].split(/\s+/)
					vertices.map(x => dataObj.positions.push(parseFloat(x)))
				}
				i = i + numberOfPoints
				dataObj.numberOfPoints = numberOfPoints
			}
			if (
				line[i]
					.split(/\s+/)[0]
					.toLowerCase()
					.match(/^cells/)
			) {
				const numberOfCells = parseInt(line[i].split(/\s+/)[1])
				i = 1 + i
				for (let k = 0; k < numberOfCells; k++) {
					const cellsData = line[i + k].split(/\s+/).map(x => parseInt(x))
					if (cellsData[0] >= 3)
						// if numVertices is 4, push  0,1,2  0,2,3
						for (let j = 2; j < cellsData[0]; ++j)
							dataObj.indices.push(cellsData[1], cellsData[j], cellsData[j + 1])
				}
				i = i + numberOfCells
				dataObj.numberOfCells = numberOfCells
				//							console.log(dataObj.indices);
			}
			if (
				line[i]
					.split(/\s+/)[0]
					.toLowerCase()
					.match(/^cells_types/)
			) {
				const numberOfCellstypes = parseFloat(line[i].split(/\s+/)[1])
				i = i + numberOfCellstypes
			}
			if (
				line[i]
					.split(/\s+/)[0]
					.toLowerCase()
					.match(/^point_data/)
			) {
				const numberOfPointData = parseFloat(line[i].split(/\s+/)[1])
				while (i + numberOfPointData < line.length) {
					const pointData = {}
					i = i + 1
					pointData.name = line[i].split(/\s+/)[1]
					i = i + 2
					pointData.point = []
					for (let k = 0; k < numberOfPointData; k++) {
						pointData.point.push(parseFloat(line[i + k]))
					}
					[pointData.min, pointData.max] = minMaxArray(pointData.point)

					dataObj.pointDatas.push(pointData)
					i = i + numberOfPointData - 1
				}
			}
		}
		return dataObj
		//		console.log('finish vtkLoader')
	}
}
