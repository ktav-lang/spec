>>>>> lang=en
  node: {
    host: "a.example",
    port: 1080,
    auth: "p@ss:word",
  },

  motd: "Welcome to the node.\nPlease behave.",
}
```

### Numbers are typed by lexical form

On the minimum required domain, the format types a scalar from the
*shape* of its body: a bare integer becomes an Integer, a bare decimal
becomes a Float, and everything else stays a String. No marker is
needed. Nothing that merely *looks* number-ish but isn't a bare number
(a version, a label) is coerced — and `::` forces a genuine bare number
to stay a literal string when you need that. On this minimum domain, a
bare integer outside i64, or a bare decimal that overflows to non-finite
on binary64, is kept as a String; a wider implementation MAY retain the
literal as Integer or Float. A decimal that *underflows in the tested
implementation's domain* still becomes a Float, rounded to signed
`0.0` in that domain, not a String; a wider domain in which it does
not underflow retains a non-zero Float. The abstract programmatic Float
carrier MUST distinguish NaN, +Infinity, and -Infinity so writer-conformance
tests can supply the three non-finite sentinels; those sentinels are outside
the parseable and canonical domains. Parsed Floats are finite members of the
declared Float domain. That domain includes its decimal-conversion and
rounding semantics and MUST admit only finite Float values. Every non-zero finite Float MUST have a finite decimal
representation that round-trips exactly; signed zeros are handled
separately and remain `0.0` / `-0.0`;
the minimum binary64 conversion uses `roundTiesToEven`. An unsupported
exact-rational value such as `1/3` is outside the declared Ktav Float domain
and is not a parseable or canonical Float.

>>>>> lang=ru
  node: {
    host: "a.example",
    port: 1080,
    auth: "p@ss:word",
  },

  motd: "Welcome to the node.\nPlease behave.",
}
```

### Числа типизируются по лексической форме

В минимальном обязательном домене формат определяет тип скаляра по
*форме* тела: голое целое становится Integer, голое десятичное — Float,
всё остальное остаётся String. Маркер не нужен. Ничто, что лишь
*похоже* на число, но не является голым числом (версия, метка), не
приводится — а `::` заставляет настоящее голое число остаться
литеральной строкой, когда это нужно. В этом минимальном домене голое
целое за пределами i64 или голое десятичное, переполняющееся до
non-finite на binary64, остаётся String; более широкий домен MAY
классифицировать такой пограничный литерал как Integer или Float.
Десятичное, которое уходит в *underflow в домене тестируемой реализации*,
всё равно становится Float, округлённым до знакового `0.0` в этом
домене, а не String; более широкий домен, в котором underflow не
происходит, сохраняет ненулевой Float. Абстрактный программный Float-носитель
MUST различать NaN, +Infinity и -Infinity, чтобы writer-conformance мог
подать три неконечных sentinel; они находятся вне парсируемого и
канонического доменов. Float, полученный парсингом, конечен и принадлежит
заявленному домену Float. Этот домен включает семантику decimal-преобразования
и округления и MUST допускать только конечные Float. Каждый ненулевой конечный Float MUST иметь конечное
десятичное представление, точно проходящее round-trip; знаковые нули
обрабатываются отдельно и сохраняются как `0.0` / `-0.0`; минимальное
binary64 использует `roundTiesToEven`.
Неподдерживаемое точное рациональное значение вроде `1/3` находится
вне заявленного домена Ktav Float и не является парсируемым или
каноническим Float.

>>>>> lang=zh
  node: {
    host: "a.example",
    port: 1080,
    auth: "p@ss:word",
  },

  motd: "Welcome to the node.\nPlease behave.",
}
```

### 数字按词法形式定型

在最小必需数值域中,格式按 body 的*形状*定型:裸整数成为 Integer,
裸小数成为 Float,其余一切保持为 String。无需标记。任何只是*看起来*
像数字、却并非裸数字的内容(版本号、标签)都不会被转换 —— 而 `::`
可在需要时强制一个真正的裸数字保持为字面字符串。在该最小域中,
超出 i64 范围的裸整数,或者在 binary64 上溢出为非有限的裸小数,
反而保持为 String;更宽的实现 MAY 将该边界字面量分类为 Integer
或 Float。在*被测实现的域中下溢*的小数仍然成为 Float,并在该域中
舍入到带符号的 `0.0`,而非 String;若更宽的域中不发生下溢,则保留
非零 Float。抽象的程序化 Float 载体 MUST 区分 NaN、+Infinity 与
-Infinity,以便 writer-conformance 提供三个非有限 sentinel;这些
sentinel 位于可解析域与规范域之外。解析产生的 Float 是有限值,属于
声明的 Float 域。该域包括十进制转换与舍入语义,并 MUST 只接纳
有限 Float。每个非零有限 Float MUST 拥有可精确 round-trip 的有限
十进制表示;
带符号零另行处理,保持为 `0.0` / `-0.0`;最小 binary64 转换使用
`roundTiesToEven`。不支持的精确有理值(如 `1/3`)不属于声明的 Ktav
Float 域,也不是可解析或规范 Float。

