>>>>> lang=en
A bare number is typed directly on the minimum required domain —
`port: 8080` gives you an Integer, `ratio: 0.5` a Float. The body's
shape decides: digits only → Integer; digits with a decimal point or
exponent → Float; anything else → String. At the minimum numeric
boundaries, an integer outside i64 or a decimal that overflows to
non-finite on binary64 is kept as a String instead of wrapping or
raising an error; a wider domain MAY classify that same boundary literal
as Integer or Float. A decimal that *underflows in the implementation's
domain* still becomes a Float, rounded to signed `0.0` in that domain;
a wider domain in which it does not underflow retains a non-zero Float.
The abstract programmatic Float carrier MUST distinguish NaN, +Infinity,
and -Infinity for writer-conformance; these sentinels are outside the
parseable and canonical domains. Parsed Floats are finite members of the
declared Float domain, which includes decimal-conversion and rounding
semantics; every admitted non-zero finite Float MUST have a finite decimal
candidate that round-trips exactly. Signed zeros are handled separately
and remain `0.0` / `-0.0`; minimum binary64 uses `roundTiesToEven`. A
finite host value without such a candidate, such as exact-rational `1/3`,
is outside the declared Ktav Float domain and is not a parseable or
canonical Float.

```text
port:    8080
ratio:   0.5
offset:  -100
eps:     1.5e-10
```

>>>>> lang=ru
В минимальном обязательном домене голое число типизируется сразу:
`port: 8080` даёт Integer, `ratio: 0.5` — Float. Решает форма тела:
только цифры → Integer; цифры с десятичной точкой или экспонентой →
Float; всё остальное → String. На минимальных числовых границах целое
за пределами i64 или десятичное, переполняющееся до non-finite на
binary64, остаётся String — без молчаливого переполнения и без
исключения при разборе; более широкий домен MAY классифицировать такой
пограничный литерал как Integer или Float. Десятичное, которое уходит
в *underflow в домене реализации*, всё равно становится Float,
округлённым до знакового `0.0` в этом домене; более широкий домен,
в котором underflow не происходит, сохраняет ненулевой Float. Абстрактный
программный Float-носитель MUST различать NaN, +Infinity и -Infinity для
writer-conformance; эти sentinel находятся вне парсируемого и канонического
доменов. Float, полученный парсингом, конечен и принадлежит заявленному
домену Float, который включает семантику decimal-преобразования и
округления; каждый
допускаемый ненулевой конечный Float MUST иметь конечный десятичный
кандидат, точно проходящий round-trip. Знаковые нули обрабатываются
отдельно и сохраняются как `0.0` / `-0.0`; минимальное binary64
использует `roundTiesToEven`. Конечное значение хост-представления без
такого кандидата, например точная рациональ `1/3`, находится вне
заявленного домена Ktav Float и не является парсируемым или каноническим
Float.

```text
port:    8080
ratio:   0.5
offset:  -100
eps:     1.5e-10
```

>>>>> lang=zh
在最小必需数值域中,裸数字会被直接定型:`port: 8080` 给你
Integer,`ratio: 0.5` 给你 Float。由 body 的形状决定:只有数字 →
Integer;带小数点或指数 → Float;其余一切 → String。在最小数值
边界上,超出 i64 范围的整数,或者在 binary64 上溢出为非有限的小数,
会保持为 String,而不是回绕或抛出错误;更宽的域 MAY 将同一边界
字面量分类为 Integer 或 Float。在*实现域中下溢*的小数仍然成为
Float,并在该域中舍入到带符号的 `0.0`;若更宽的域中不发生下溢,
则保留非零 Float。抽象的程序化 Float 载体 MUST 区分 NaN、+Infinity
与 -Infinity,供 writer-conformance 使用;这些 sentinel 位于可解析域
与规范域之外。解析产生的 Float 是有限值,属于声明的 Float 域,该域
包括十进制转换与舍入语义;每个被
接纳的非零有限 Float MUST 有一个可精确 round-trip 的有限十进制候选。
带符号零另行处理,保持为 `0.0` / `-0.0`;最小 binary64 转换使用
`roundTiesToEven`。主机表示中没有这种候选的有限值(例如精确有理数
`1/3`)位于声明的 Ktav Float 域之外,也不是可解析或规范 Float。

```text
port:    8080
ratio:   0.5
offset:  -100
eps:     1.5e-10
```

