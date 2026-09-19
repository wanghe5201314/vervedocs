/**
 * Chart.js 核心模块，按需注册控制器、元素、比例尺与插件
 */
import {
  Chart,
  BarController,
  LineController,
  PieController,
  DoughnutController,
  RadarController,
  ScatterController,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  BarElement,
  LineElement,
  ArcElement,
  Title,
  Legend,
  Tooltip,
  Filler
} from 'chart.js'

Chart.register(
  BarController,
  LineController,
  PieController,
  DoughnutController,
  RadarController,
  ScatterController,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  BarElement,
  LineElement,
  ArcElement,
  Title,
  Legend,
  Tooltip,
  Filler
)

export default Chart