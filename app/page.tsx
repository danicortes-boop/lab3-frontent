"use client"

import { useEffect, useRef, useState } from "react"

interface VentasData {
  producto: string
  mes: string
  ventas: number
  ingresos: number
  precio: number
}

export default function Dashboard() {
  const [data, setData] = useState<VentasData[]>([])
  const googleChartRef = useRef<HTMLDivElement>(null)
  const d3ChartRef = useRef<HTMLDivElement>(null)
  const [isUpdated, setIsUpdated] = useState(false)

  // Load JSON data on mount
  useEffect(() => {
    fetch("/ventas.json")
      .then((res) => res.json())
      .then((jsonData) => setData(jsonData))
      .catch((err) => console.error("Error loading data:", err))
  }, [])

  // Initialize Google Chart when data loads
  useEffect(() => {
    if (data.length === 0) return

    const script = document.createElement("script")
    script.src = "https://www.gstatic.com/charts/loader.js"
    script.onload = () => {
      window.google.charts.load("current", { packages: ["corechart"] })
      window.google.charts.setOnLoadCallback(drawChart)
    }
    document.head.appendChild(script)

    function drawChart() {
      const chartData = [["Mes", "Smartphone A", "Smartphone B", "Tablet X"]]

      const enero = data.filter((d) => d.mes === "Enero")
      const febrero = data.filter((d) => d.mes === "Febrero")

      chartData.push([
        "Enero",
        enero.find((d) => d.producto === "Smartphone A")?.ventas || 0,
        enero.find((d) => d.producto === "Smartphone B")?.ventas || 0,
        enero.find((d) => d.producto === "Tablet X")?.ventas || 0,
      ])

      chartData.push([
        "Febrero",
        febrero.find((d) => d.producto === "Smartphone A")?.ventas || 0,
        febrero.find((d) => d.producto === "Smartphone B")?.ventas || 0,
        febrero.find((d) => d.producto === "Tablet X")?.ventas || 0,
      ])

      const options = {
        title: "Evolución de Ventas por Producto",
        legend: { position: "bottom" },
        hAxis: {
          title: "Mes",
        },
        vAxis: {
          title: "Número de Ventas",
        },
        colors: ["#2563eb", "#dc2626", "#16a34a"],
        backgroundColor: "#ffffff",
        bar: { groupWidth: "75%" },
      }

      const table = window.google.visualization.arrayToDataTable(chartData)
      const chart = new window.google.visualization.ColumnChart(googleChartRef.current)
      chart.draw(table, options)
    }
  }, [data])

  // Initialize D3.js chart when data loads
  useEffect(() => {
    if (data.length === 0 || !d3ChartRef.current) return

    const script = document.createElement("script")
    script.src = "https://d3js.org/d3.v7.min.js"
    script.onload = () => {
      drawD3Chart()
    }
    document.head.appendChild(script)

    function drawD3Chart() {
      const d3 = (window as any).d3

      const container = d3ChartRef.current
      if (!container) return

      // Clear previous chart
      d3.select(container).selectAll("*").remove()

      const containerWidth = container.clientWidth
      const width = Math.max(300, containerWidth - 40)
      const height = Math.max(300, containerWidth * 0.6)
      const margin = { top: 30, right: 30, bottom: 50, left: 60 }

      const svg = d3
        .select(container)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .style("max-width", "100%")
        .style("height", "auto")

      // Scales
      const xScale = d3
        .scaleLinear()
        .domain([0, d3.max(data, (d: any) => d.ventas) * 1.1])
        .range([margin.left, width - margin.right])

      const yScale = d3
        .scaleLinear()
        .domain([0, d3.max(data, (d: any) => d.ingresos) * 1.1])
        .range([height - margin.bottom, margin.top])

      const colorScale = d3
        .scaleOrdinal()
        .domain(["Smartphone A", "Smartphone B", "Tablet X"])
        .range(["#2563eb", "#dc2626", "#16a34a"])

      const sizeScale = d3
        .scaleSqrt()
        .domain([0, d3.max(data, (d: any) => d.precio)])
        .range([10, 60])

      // X Axis
      svg
        .append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(xScale))
        .append("text")
        .attr("x", width / 2)
        .attr("y", 40)
        .attr("fill", "#000")
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .text("Ventas")

      // Y Axis
      svg
        .append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -40)
        .attr("x", -height / 2)
        .attr("fill", "#000")
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .text("Ingresos")

      // Bubbles with animation
      svg
        .selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", (d: any) => xScale(d.ventas))
        .attr("cy", (d: any) => yScale(d.ingresos))
        .attr("r", 0)
        .attr("fill", (d: any) => colorScale(d.producto))
        .attr("opacity", 0.7)
        .transition()
        .duration(800)
        .attr("r", (d: any) => sizeScale(d.precio))
        .on("end", function () {
          d3.select(this)
            .on("mouseover", function (event: any, d: any) {
              d3.select(this)
                .transition()
                .duration(200)
                .attr("opacity", 1)
                .attr("r", sizeScale(d.precio) * 1.3)

              const tooltip = d3
                .select("body")
                .append("div")
                .style("position", "absolute")
                .style("background", "rgba(0,0,0,0.8)")
                .style("color", "white")
                .style("padding", "8px 12px")
                .style("border-radius", "4px")
                .style("font-size", "12px")
                .style("pointer-events", "none")
                .style("z-index", "1000")
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 10 + "px")
                .text(`${d.producto} - ${d.mes}: ${d.ventas} ventas, $${d.ingresos.toLocaleString()}`)

              setTimeout(() => tooltip.remove(), 3000)
            })
            .on("mouseout", function (this: any, d: any) {
              d3.select(this).transition().duration(200).attr("opacity", 0.7).attr("r", sizeScale(d.precio))
            })
        })

      // Legend
      const legendData = ["Smartphone A", "Smartphone B", "Tablet X"]
      const legend = svg
        .selectAll(".legend")
        .data(legendData)
        .enter()
        .append("g")
        .attr("class", "legend")
        .attr("transform", (d: any, i: number) => `translate(${margin.left}, ${margin.top + i * 25})`)

      legend
        .append("circle")
        .attr("r", 6)
        .attr("fill", (d: any) => colorScale(d))

      legend
        .append("text")
        .attr("x", 15)
        .attr("y", 5)
        .attr("font-size", "12px")
        .text((d: any) => d)
    }
  }, [data])

  // Update data with random variations
  const handleUpdateData = () => {
    const updatedData = data.map((item) => ({
      ...item,
      ventas: Math.max(1, Math.round(item.ventas * (0.8 + Math.random() * 0.4))),
      ingresos: Math.max(1, Math.round(item.ingresos * (0.8 + Math.random() * 0.4))),
    }))
    setData(updatedData)
    setIsUpdated(true)
    setTimeout(() => setIsUpdated(false), 2000)
  }

  return (
    <main className="min-h-screen bg-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">Dashboard de Ventas</h1>
          <p className="text-sm md:text-base text-slate-600">
            Análisis interactivo de Smartphone A, Smartphone B y Tablet X
          </p>
        </div>

        {/* Update Button */}
        <div className="mb-6">
          <button
            onClick={handleUpdateData}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm md:text-base"
          >
            Actualizar Datos (±10-20%)
          </button>
          {isUpdated && <span className="ml-3 text-green-600 font-medium text-sm">Datos actualizados</span>}
        </div>

        {/* Google Charts - Column Chart */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 md:p-6 mb-8 overflow-x-auto">
          <h2 className="text-lg md:text-xl font-bold text-slate-900 mb-4">
            Visualización Básica: Gráfico de Columnas
          </h2>
          <div ref={googleChartRef} className="w-full" style={{ height: "400px", minWidth: "300px" }}></div>
        </div>

        {/* D3.js - Bubble Chart */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 md:p-6 overflow-x-auto">
          <h2 className="text-lg md:text-xl font-bold text-slate-900 mb-2">
            Visualización Multidimensional: Gráfico de Burbujas con D3.js
          </h2>
          <p className="text-xs md:text-sm text-slate-600 mb-4">
            Tamaño de burbuja = Precio del producto | Posición X = Ventas | Posición Y = Ingresos | Color = Producto
          </p>
          <div ref={d3ChartRef} className="w-full flex justify-center"></div>
        </div>
      </div>
    </main>
  )
}
